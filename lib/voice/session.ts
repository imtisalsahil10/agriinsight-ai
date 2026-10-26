import type { Language } from '../../types';
import { failureCode, voiceErrorMessage } from './errors';
import { logVoiceMetric } from './metrics';
import { initialState, transition } from './sessionMachine';
import { createSpeechPlanner } from './speechText';
import type { ToolResult } from '../tools/types';
import type { ProviderEvent, ReplyRequest, ReplyResult, SessionState, VoiceMode, VoiceProvider, VoiceSession } from './types';

export interface VoiceSessionOptions {
  provider: VoiceProvider;
  language: () => Language;
  history: () => Array<{ role: 'user' | 'model'; content: string }>;
  reply: (request: ReplyRequest) => Promise<ReplyResult>;
  onUser?: (text: string) => void;
  onAssistant?: (result: ReplyResult) => void;
  onTool?: (result: ToolResult) => void;
  now?: () => number;
  mode?: VoiceMode;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function createVoiceSession(options: VoiceSessionOptions): VoiceSession {
  const now = options.now ?? (() => Date.now());
  let machine = initialState(options.mode ?? 'push-to-talk');
  let disposed = false;
  let suppressMic = false;
  let turn: AbortController | null = null;
  let turnId = 0;
  let pendingSpeech = 0;
  let replyDone = false;
  let metricLogged = false;
  let turnStartedAt = 0;
  const speechTokens: number[] = [];
  let speechToken = 0;
  let announcing = false;
  let liveSaved = false;
  const listeners = new Set<(state: SessionState) => void>();

  function ownsTurns(): boolean {
    return options.provider.handlesTurns === true;
  }

  function emit(): void {
    if (disposed) return;
    for (const listener of listeners) listener(machine);
  }

  function dispatch(event: Parameters<typeof transition>[1]): boolean {
    const result = transition(machine, event);
    if (!result.accepted) return false;
    machine = result.state;
    emit();
    return true;
  }

  function logTurn(timeToFirstAudioMs: number | null): void {
    if (metricLogged) return;
    metricLogged = true;
    logVoiceMetric({ timeToFirstAudioMs, toolDurationMs: null });
  }

  function cancelPlayback(): void {
    speechToken += 1;
    speechTokens.length = 0;
    pendingSpeech = 0;
    options.provider.bargeIn();
  }

  function queueSpeech(lines: string[]): void {
    const language = options.language();
    for (const line of lines) {
      if (!line.trim()) continue;
      speechTokens.push(speechToken);
      pendingSpeech += 1;
      options.provider.speak(line, language);
    }
  }

  function restartHandsFree(): void {
    if (disposed || suppressMic || machine.phase !== 'listening') return;
    void options.provider.start().catch((error: unknown) => {
      if (disposed) return;
      announce(voiceErrorMessage(failureCode(error), options.language()));
    });
  }

  function maybeFinishSpeaking(): void {
    if (!replyDone || pendingSpeech > 0 || disposed) return;
    if (machine.phase === 'thinking') {
      logTurn(null);
      const restart = machine.mode === 'hands-free';
      dispatch({ type: 'first-audio' });
      dispatch({ type: 'spoken-done' });
      announcing = false;
      if (restart) restartHandsFree();
      return;
    }
    if (machine.phase !== 'speaking') return;
    const restart = !machine.announcingError && machine.mode === 'hands-free';
    dispatch({ type: 'spoken-done' });
    announcing = false;
    if (restart) restartHandsFree();
  }

  function announce(message: string): void {
    if (announcing) {
      pendingSpeech = 0;
      speechTokens.length = 0;
      dispatch({ type: 'spoken-done' });
      announcing = false;
      return;
    }
    announcing = true;
    turnId += 1;
    turn?.abort();
    turn = null;
    replyDone = false;
    cancelPlayback();
    dispatch({ type: 'fail', message });
    replyDone = true;
    queueSpeech([message]);
    maybeFinishSpeaking();
  }

  async function beginTurn(text: string): Promise<void> {
    if (suppressMic || disposed) return;
    if (!dispatch({ type: 'heard', text })) return;
    const id = ++turnId;
    metricLogged = false;
    replyDone = false;
    turnStartedAt = now();
    const prior = options.history().slice();
    options.onUser?.(text.trim());
    const planner = createSpeechPlanner(options.language());
    const controller = new AbortController();
    turn = controller;
    try {
      const result = await options.reply({
        prompt: text.trim(),
        history: prior,
        language: options.language(),
        signal: controller.signal,
        onDelta: (fullText) => {
          if (id !== turnId || controller.signal.aborted) return;
          dispatch({ type: 'assistant', text: fullText });
          queueSpeech(planner.push(fullText, false));
        },
      });
      if (id !== turnId || controller.signal.aborted || disposed) return;
      dispatch({ type: 'assistant', text: result.text });
      const lines = planner.push(result.text, true);
      if (!planner.spoke && lines.length === 0) {
        logTurn(null);
        announce(voiceErrorMessage('reply-failed', options.language()));
        return;
      }
      queueSpeech(lines);
      replyDone = true;
      options.onAssistant?.(result);
      maybeFinishSpeaking();
    } catch (error) {
      if (id !== turnId || disposed || isAbort(error) || controller.signal.aborted) return;
      logTurn(null);
      announce(voiceErrorMessage('reply-failed', options.language()));
    }
  }

  function onProviderEvent(event: ProviderEvent): void {
    if (disposed) return;
    switch (event.type) {
      case 'partial':
        if (suppressMic) return;
        dispatch({ type: 'partial', text: event.text });
        break;
      case 'level':
        dispatch({ type: 'level', level: event.level });
        break;
      case 'final':
        if (suppressMic) return;
        if (ownsTurns()) {
          liveSaved = false;
          if (machine.phase === 'thinking' || machine.phase === 'speaking') {
            dispatch({ type: 'barge-in' });
          }
          if (!dispatch({ type: 'heard', text: event.text })) return;
          turnStartedAt = now();
          metricLogged = false;
          replyDone = false;
          options.onUser?.(event.text.trim());
          return;
        }
        void beginTurn(event.text);
        break;
      case 'assistant':
        if (!ownsTurns() || suppressMic) return;
        dispatch({ type: 'assistant', text: event.text });
        break;
      case 'tool':
        options.onTool?.(event.result);
        break;
      case 'silence':
        if (suppressMic || machine.phase !== 'listening') return;
        dispatch({ type: 'silence', message: voiceErrorMessage('no-speech', options.language()) });
        replyDone = true;
        queueSpeech([voiceErrorMessage('no-speech', options.language())]);
        maybeFinishSpeaking();
        break;
      case 'speech-start':
        if (!machine.announcingError) logTurn(Math.max(0, now() - turnStartedAt));
        dispatch({ type: 'first-audio' });
        break;
      case 'speech-end': {
        if (ownsTurns()) {
          if (!liveSaved && machine.assistantText.trim()) {
            liveSaved = true;
            options.onAssistant?.({ text: machine.assistantText, sources: [] });
          }
          replyDone = true;
          pendingSpeech = 0;
          maybeFinishSpeaking();
          break;
        }
        const expected = speechTokens.shift();
        if (expected !== speechToken) return;
        pendingSpeech = Math.max(0, pendingSpeech - 1);
        maybeFinishSpeaking();
        break;
      }
      case 'error':
        if (suppressMic) return;
        announce(voiceErrorMessage(event.code, options.language()));
        break;
      default:
        break;
    }
  }

  const unsubscribe = options.provider.subscribe(onProviderEvent);

  return {
    getState: () => machine,
    subscribe(listener) {
      listeners.add(listener);
      listener(machine);
      return () => listeners.delete(listener);
    },
    async start() {
      if (disposed) return;
      if (machine.phase === 'thinking' || machine.phase === 'speaking') {
        this.bargeIn();
        return;
      }
      if (machine.phase === 'listening') return;
      suppressMic = false;
      try {
        await options.provider.start();
        if (disposed) return;
        dispatch({ type: 'start' });
      } catch (error) {
        if (disposed) return;
        announce(voiceErrorMessage(failureCode(error), options.language()));
      }
    },
    release() {
      if (disposed || machine.phase !== 'listening') return;
      options.provider.stop();
    },
    bargeIn() {
      if (disposed) return;
      if (machine.phase !== 'thinking' && machine.phase !== 'speaking') return;
      if (!metricLogged && machine.phase === 'thinking') logTurn(null);
      turnId += 1;
      turn?.abort();
      turn = null;
      replyDone = false;
      cancelPlayback();
      dispatch({ type: 'barge-in' });
      suppressMic = false;
      void options.provider.start().catch((error: unknown) => {
        if (disposed) return;
        announce(voiceErrorMessage(failureCode(error), options.language()));
      });
    },
    stop() {
      if (disposed) return;
      suppressMic = true;
      turnId += 1;
      turn?.abort();
      turn = null;
      replyDone = false;
      options.provider.suspend?.();
      cancelPlayback();
      dispatch({ type: 'stop' });
    },
    dispose() {
      disposed = true;
      suppressMic = true;
      turnId += 1;
      turn?.abort();
      turn = null;
      options.provider.suspend?.();
      cancelPlayback();
      options.provider.dispose?.();
      unsubscribe();
      listeners.clear();
    },
    inject(text: string) {
      if (disposed || !text.trim()) return;
      if (options.provider.sendText) {
        liveSaved = false;
        replyDone = false;
        metricLogged = false;
        turnStartedAt = now();
        if (machine.phase === 'idle') dispatch({ type: 'start' });
        dispatch({ type: 'heard', text: text.trim().slice(0, 160) });
        options.provider.sendText(text);
        return;
      }
      replyDone = false;
      queueSpeech([text]);
      replyDone = true;
      maybeFinishSpeaking();
    },
    setMode(mode: VoiceMode) {
      options.provider.setMode(mode);
      dispatch({ type: 'set-mode', mode });
    },
  };
}
