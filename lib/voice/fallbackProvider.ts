import type { Language } from '../../types';
import { loadFieldPrefs } from '../field/prefs';
import { VoiceFailure } from './errors';
import type { ProviderEvent, VoiceMode, VoiceProvider } from './types';
import { stripWakeWord } from './wakeWord';
import { getSpeechRecognition, isSecureVoiceContext, transcriptFromResults, type SpeechRecognitionLike } from './webSpeech';

const LISTEN_TIMEOUT_MS = 15_000;

interface AudioMeter {
  stream: MediaStream;
  context: AudioContext;
  frame: number;
}

export interface FallbackProviderOptions {
  language: () => Language;
}

/**
 * Web Speech dictation, streaming is handled by the session, and speechSynthesis playback.
 * bargeIn() cancels speech immediately and drops the current recognition result.
 */
export function createFallbackProvider(options: FallbackProviderOptions): VoiceProvider {
  const listeners = new Set<(event: ProviderEvent) => void>();
  let mode: VoiceMode = 'push-to-talk';
  let recognition: SpeechRecognitionLike | null = null;
  let activeId = 0;
  let finalSent = false;
  let lastPartial = '';
  let timeoutId = 0;
  let meter: AudioMeter | null = null;
  let ignoreEnd = false;

  function emit(event: ProviderEvent): void {
    for (const listener of listeners) listener(event);
  }

  function clearTimer(): void {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = 0;
    }
  }

  function stopMeter(): void {
    if (!meter) return;
    window.cancelAnimationFrame(meter.frame);
    meter.context.close().catch(() => undefined);
    for (const track of meter.stream.getTracks()) track.stop();
    meter = null;
    emit({ type: 'level', level: 0 });
  }

  function startMeter(): void {
    if (!navigator.mediaDevices?.getUserMedia) return;
    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (!recognition) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = (): void => {
        if (!meter) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
          const sample = (value - 128) / 128;
          sum += sample * sample;
        }
        const level = Math.min(1, Math.sqrt(sum / data.length) * 4);
        emit({ type: 'level', level });
        meter.frame = window.requestAnimationFrame(tick);
      };
      meter = { stream, context, frame: 0 };
      meter.frame = window.requestAnimationFrame(tick);
    }).catch(() => undefined);
  }

  function dropRecognition(): void {
    activeId += 1;
    ignoreEnd = true;
    clearTimer();
    const current = recognition;
    recognition = null;
    lastPartial = '';
    if (!current) return;
    try {
      current.abort();
    } catch {
      /* already stopped */
    }
  }

  return {
    setMode(next) {
      mode = next;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      const Ctor = getSpeechRecognition();
      if (!Ctor) return Promise.reject(new VoiceFailure('unsupported'));
      if (!isSecureVoiceContext()) return Promise.reject(new VoiceFailure('insecure'));
      if (!navigator.onLine) return Promise.reject(new VoiceFailure('offline'));

      dropRecognition();
      ignoreEnd = false;
      const id = activeId;
      const next = new Ctor();
      recognition = next;
      finalSent = false;
      lastPartial = '';
      next.continuous = false;
      next.interimResults = true;
      next.maxAlternatives = 1;
      next.lang = options.language();

      return new Promise<void>((resolve, reject) => {
        let settled = false;
        next.onstart = () => {
          if (id !== activeId) return;
          settled = true;
          resolve();
          startMeter();
          clearTimer();
          const timeoutMs = mode === 'hands-free' ? 20_000 : LISTEN_TIMEOUT_MS;
          timeoutId = window.setTimeout(() => {
            if (id !== activeId) return;
            try {
              next.stop();
            } catch {
              emit({ type: 'silence' });
            }
          }, timeoutMs);
        };
        next.onresult = (event) => {
          if (id !== activeId) return;
          const heard = transcriptFromResults(event.results);
          const text = stripWakeWord(heard.text, loadFieldPrefs().wakeWord);
          if (!text) return;
          lastPartial = text;
          if (heard.isFinal) {
            finalSent = true;
            clearTimer();
            emit({ type: 'final', text });
            return;
          }
          emit({ type: 'partial', text });
        };
        next.onerror = (event) => {
          if (id !== activeId || ignoreEnd) return;
          if (event.error === 'aborted') return;
          if (event.error === 'no-speech') {
            finalSent = true;
            emit({ type: 'silence' });
            return;
          }
          const code = event.error === 'network'
            ? 'network'
            : event.error === 'not-allowed' || event.error === 'service-not-allowed'
              ? 'not-allowed'
              : event.error === 'audio-capture'
                ? 'audio-capture'
                : event.error === 'language-not-supported'
                  ? 'language'
                  : 'start-failed';
          if (!settled) {
            settled = true;
            reject(new VoiceFailure(code));
            return;
          }
          emit({ type: 'error', code });
        };
        next.onend = () => {
          if (id !== activeId) return;
          clearTimer();
          stopMeter();
          recognition = null;
          if (ignoreEnd) {
            ignoreEnd = false;
            return;
          }
          if (finalSent) return;
          if (lastPartial) {
            finalSent = true;
            emit({ type: 'final', text: lastPartial });
            return;
          }
          emit({ type: 'silence' });
        };
        try {
          next.start();
        } catch {
          recognition = null;
          reject(new VoiceFailure('start-failed'));
        }
      });
    },
    stop() {
      clearTimer();
      const current = recognition;
      if (!current) {
        if (!finalSent && lastPartial) emit({ type: 'final', text: lastPartial });
        else if (!finalSent) emit({ type: 'silence' });
        stopMeter();
        return;
      }
      try {
        current.stop();
      } catch {
        emit(lastPartial ? { type: 'final', text: lastPartial } : { type: 'silence' });
      }
    },
    bargeIn() {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      dropRecognition();
      stopMeter();
    },
    speak(text, language) {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        emit({ type: 'error', code: 'reply-failed' });
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = loadFieldPrefs().speechRate;
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((voice) => voice.lang === language)
        ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()));
      if (match) utterance.voice = match;
      let ended = false;
      const finish = (): void => {
        if (ended) return;
        ended = true;
        emit({ type: 'speech-end' });
      };
      utterance.onstart = () => emit({ type: 'speech-start' });
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    },
  };
}
