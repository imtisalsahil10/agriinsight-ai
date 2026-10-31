import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai';
import { loadFarm } from '../farm/store';
import { voiceFor } from '../i18n';
import { runTool, toolDeclarations } from '../tools/registry';
import type { Language } from '../../types';
import { failureFromMic, VoiceFailure } from './errors';
import {
  downsample,
  floatToPcm16,
  INPUT_RATE,
  pcm16ToBase64,
  PcmPlayer,
} from './pcmPlayer';
import { MAX_RECONNECTS, reconnectDelayMs, socketClosePlan } from './reconnect';
import { mergeTranscript } from './transcript';
import type { ProviderEvent, VoiceMode, VoiceProvider } from './types';

/**
 * Gemini Live in the browser.
 * Model: gemini-3.8-live
 * API version: v1beta
 * Input: 16-bit PCM at 16 kHz. Output: 16-bit PCM at 24 kHz, scheduled gaplessly.
 * The output AudioContext is created inside the click that starts listening,
 * before any await, so autoplay rules do not leave it suspended.
 * Button barge-in stops local playback and drops the rest of that reply.
 * It does not send turnComplete, which would start another generation.
 */

const LIVE_MODEL = 'gemini-3.8-live';
const LIVE_API_VERSION = 'v1beta';
const BARGE_LEVEL = 0.72;

const WORKLET_SOURCE = `
class AgriCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.target = 16000;
    this.hold = new Float32Array(0);
    this.batch = 1600;
    this.peak = 0;
  }
  expand(extra) {
    const next = new Float32Array(this.hold.length + extra.length);
    next.set(this.hold, 0);
    next.set(extra, this.hold.length);
    this.hold = next;
  }
  take(count) {
    const frame = new Float32Array(count);
    frame.set(this.hold.subarray(0, count));
    const rest = new Float32Array(this.hold.length - count);
    rest.set(this.hold.subarray(count));
    this.hold = rest;
    return frame;
  }
  downsample(input) {
    const rate = sampleRate;
    if (rate === this.target) return input;
    const ratio = rate / this.target;
    const length = Math.floor(input.length / ratio);
    const result = new Float32Array(length);
    const last = input.length - 1;
    for (let i = 0; i < length; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;
      const left = input[index] || 0;
      const right = input[Math.min(index + 1, last)] || left;
      result[i] = left + (right - left) * fraction;
    }
    return result;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;
    let sum = 0;
    for (let i = 0; i < channel.length; i++) sum += channel[i] * channel[i];
    this.peak = Math.max(this.peak, Math.min(1, Math.sqrt(sum / channel.length) * 4));
    const samples = this.downsample(channel);
    this.expand(samples);
    if (this.hold.length < this.batch) return true;
    const frame = this.take(this.batch);
    const pcm = new Int16Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      const sample = Math.max(-1, Math.min(1, frame[i]));
      pcm[i] = sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
    }
    const level = this.peak;
    this.peak = 0;
    this.port.postMessage({ pcm, level }, [pcm.buffer]);
    return true;
  }
}
registerProcessor('agri-capture', AgriCapture);
`;

let workletUrl: string | null = null;

function workletModuleUrl(): string {
  if (!workletUrl) {
    workletUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
  }
  return workletUrl;
}

export interface GeminiLiveOptions {
  language: () => Language;
}

interface Capture {
  context: AudioContext;
  stream: MediaStream;
  processor: ScriptProcessorNode | null;
  worklet: AudioWorkletNode | null;
}

interface PendingMic {
  stream: Promise<MediaStream>;
  context: AudioContext;
}

interface CaptureFrame {
  pcm?: Int16Array;
  level: number;
}

export function createGeminiLiveProvider(options: GeminiLiveOptions): VoiceProvider {
  const listeners = new Set<(event: ProviderEvent) => void>();
  let mode: VoiceMode = 'push-to-talk';
  let socket: Session | null = null;
  let opening: Promise<void> | null = null;
  let socketGen = 0;
  let capture: Capture | null = null;
  let pendingMic: PendingMic | null = null;
  let player: PcmPlayer | null = null;
  let quiet = false;
  let closing = false;
  let recovering = false;
  let capturing = false;
  let inputText = '';
  let outputText = '';
  let finalSent = false;
  let turnDone = false;
  let playing = false;
  let ignoreAudio = false;
  let primed = false;
  let toolsInFlight = 0;
  let resumeHandle = '';
  let lastLevelAt = 0;
  let awaitingUser = false;
  let uplinkOpenAt = 0;

  function emit(event: ProviderEvent): void {
    for (const listener of listeners) listener(event);
  }

  function emitLevel(level: number): void {
    const at = typeof performance === 'undefined' ? Date.now() : performance.now();
    if (at - lastLevelAt < 80) return;
    lastLevelAt = at;
    emit({ type: 'level', level });
  }

  function systemInstruction(): string {
    const farm = loadFarm();
    const memory = farm.lastSummary ? ` Last visit: ${farm.lastSummary}` : '';
    const crops = farm.crops.length ? ` Crops: ${farm.crops.join(', ')}.` : '';
    const place = farm.location ? ` Location: ${farm.location}.` : '';
    return `You are AgriInsight, speaking with a farmer. Use short spoken sentences.
Reply in Hindi (Devanagari) when the farmer speaks Hindi. If they mix Hindi and English, reply in the same mix. If they say "Hindi mein bolo" or "English mein bolo", switch and stay there.
Use tools for weather, prices, irrigation, soil, yield, disease, notes, and reminders. Never invent a live market price. If a tool result is demo data, say it is demo data.${place}${crops}${memory}`;
  }

  function nowMs(): number {
    return typeof performance === 'undefined' ? Date.now() : performance.now();
  }

  function holdUplink(ms = 400): void {
    uplinkOpenAt = nowMs() + ms;
  }

  function commitInput(): void {
    if (finalSent || quiet) return;
    const text = inputText.trim();
    if (!text) return;
    finalSent = true;
    emit({ type: 'final', text });
  }

  function finishIfIdle(): void {
    if (quiet || awaitingUser || !turnDone || playing || toolsInFlight > 0) return;
    awaitingUser = true;
    emit({ type: 'speech-end' });
    holdUplink();
    turnDone = false;
    playing = false;
  }

  function ensurePlayer(): PcmPlayer {
    if (!player) {
      player = new PcmPlayer({
        onIdle: () => {
          playing = false;
          holdUplink();
          finishIfIdle();
        },
      });
    }
    return player;
  }

  function haltPlayback(): void {
    ensurePlayer().stop();
    playing = false;
    ignoreAudio = true;
    primed = false;
  }

  function allowPlayback(): void {
    ignoreAudio = false;
    primed = false;
  }

  function playAudio(audio: string): void {
    if (ignoreAudio) return;
    commitInput();
    if (!playing) {
      playing = true;
      emit({ type: 'speech-start' });
    }
    ensurePlayer().enqueue(audio);
  }

  function onCaptureFrame(frame: CaptureFrame): void {
    emitLevel(frame.level);
    if (!capturing || !socket || quiet) return;
    if (nowMs() < uplinkOpenAt) return;
    if (playing) {
      if (frame.level < BARGE_LEVEL) return;
      haltPlayback();
    }
    if (!frame.pcm || frame.pcm.length === 0) return;
    try {
      socket.sendRealtimeInput({
        audio: { data: pcm16ToBase64(frame.pcm), mimeType: 'audio/pcm;rate=16000' },
      });
    } catch {
      // socket closed between the check and the send
    }
  }

  async function onMessage(message: LiveServerMessage, gen: number): Promise<void> {
    if (quiet || gen !== socketGen) return;
    const content = message.serverContent;
    let skipAudio = false;
    if (content?.interrupted) {
      ensurePlayer().stop();
      playing = false;
      allowPlayback();
      skipAudio = true;
    }
    if (content?.inputTranscription?.text) {
      primed = true;
      if (playing) {
        ensurePlayer().stop();
        playing = false;
        ignoreAudio = true;
      }
      if (awaitingUser) {
        awaitingUser = false;
        inputText = '';
        outputText = '';
        finalSent = false;
        turnDone = false;
      }
      inputText = mergeTranscript(inputText, content.inputTranscription.text);
      if (!finalSent) emit({ type: 'partial', text: inputText });
    }
    if (!awaitingUser && content?.outputTranscription?.text) {
      if (primed) allowPlayback();
      commitInput();
      outputText = mergeTranscript(outputText, content.outputTranscription.text);
      emit({ type: 'assistant', text: outputText });
    }
    const audio = message.data;
    if (audio && !skipAudio && !awaitingUser) playAudio(audio);
    if (message.toolCall?.functionCalls?.length) {
      toolsInFlight += 1;
      const calls = message.toolCall.functionCalls;
      try {
        const responses = [];
        for (const call of calls) {
          if (gen !== socketGen || quiet) return;
          const name = call.name ?? 'unknown';
          const result = await runTool(name, call.args ?? {});
          if (gen !== socketGen || quiet) return;
          emit({ type: 'tool', result });
          responses.push({
            id: call.id,
            name,
            response: { output: result.summary, data: result.data },
          });
        }
        socket?.sendToolResponse({ functionResponses: responses });
      } finally {
        toolsInFlight = Math.max(0, toolsInFlight - 1);
        finishIfIdle();
      }
    }
    if (gen !== socketGen || quiet) return;
    if (message.sessionResumptionUpdate?.newHandle) {
      resumeHandle = message.sessionResumptionUpdate.newHandle;
    }
    if (content?.turnComplete) {
      turnDone = true;
      if (ignoreAudio && !primed) allowPlayback();
      if (!finalSent) commitInput();
      finishIfIdle();
    }
  }

  async function connect(): Promise<void> {
    if (socket) return;
    const gen = ++socketGen;
    const response = await fetch('/api/live-token', { method: 'POST' });
    const body = await response.json().catch(() => ({})) as { token?: string };
    if (!response.ok || !body.token) throw new VoiceFailure('network');
    if (gen !== socketGen || closing || quiet) return;
    const ai = new GoogleGenAI({
      apiKey: body.token,
      apiVersion: LIVE_API_VERSION,
      httpOptions: { apiVersion: LIVE_API_VERSION },
    });
    const language = options.language();
    ensurePlayer();
    const session = await ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: systemInstruction(),
        tools: [{ functionDeclarations: toolDeclarations }],
        sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
        contextWindowCompression: { slidingWindow: {} },
        speechConfig: {
          languageCode: language,
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceFor(language) } },
        },
      },
      callbacks: {
        onopen: () => undefined,
        onmessage: (message: LiveServerMessage) => {
          if (gen !== socketGen) return;
          void onMessage(message, gen);
        },
        onerror: () => {
          if (gen !== socketGen || closing || quiet) return;
        },
        onclose: () => {
          if (socket === session) socket = null;
          if (gen !== socketGen) return;
          if (socketClosePlan({ closing, quiet, recovering }) === 'reconnect') void recover();
        },
      },
    });
    if (gen !== socketGen || closing || quiet) {
      session.close();
      return;
    }
    socket = session;
  }

  async function ensureSocket(): Promise<void> {
    if (socket) return;
    if (!opening) {
      opening = connect().finally(() => {
        opening = null;
      });
    }
    await opening;
  }

  async function recover(): Promise<void> {
    if (socketClosePlan({ closing, quiet, recovering }) === 'ignore') return;
    recovering = true;
    emit({ type: 'connection', status: 'reconnecting' });
    try {
      for (let attempt = 1; attempt <= MAX_RECONNECTS; attempt += 1) {
        if (closing || quiet) return;
        try {
          socket = null;
          await ensureSocket();
          if (socket) {
            emit({ type: 'connection', status: 'open' });
            return;
          }
        } catch {
          // try again until the attempts run out
        }
        if (attempt < MAX_RECONNECTS) {
          await new Promise((resolve) => {
            setTimeout(resolve, reconnectDelayMs(attempt));
          });
        }
      }
      emit({ type: 'connection', status: 'open' });
      emit({ type: 'error', code: 'network' });
    } finally {
      recovering = false;
    }
  }

  function createInputContext(): AudioContext {
    const Ctx = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    try {
      return new Ctx({ sampleRate: INPUT_RATE, latencyHint: 'interactive' });
    } catch {
      return new Ctx();
    }
  }

  function beginCapture(): PendingMic | null {
    if (capture) {
      capturing = true;
      return null;
    }
    if (!navigator.mediaDevices?.getUserMedia) throw new VoiceFailure('unsupported');
    const context = createInputContext();
    if (context.state === 'suspended') void context.resume();
    const pending: PendingMic = {
      context,
      stream: navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }),
    };
    pendingMic = pending;
    return pending;
  }

  async function abandonPending(pending: PendingMic | null): Promise<void> {
    if (!pending) return;
    pending.context.close().catch(() => undefined);
    try {
      const stream = await pending.stream;
      for (const track of stream.getTracks()) track.stop();
    } catch {
      // permission denied or the request was already aborted
    }
    if (pendingMic === pending) pendingMic = null;
  }

  async function finishCapture(pending: PendingMic | null): Promise<void> {
    if (!pending) {
      capturing = true;
      return;
    }
    let stream: MediaStream;
    try {
      stream = await pending.stream;
    } catch (error) {
      pending.context.close().catch(() => undefined);
      if (pendingMic === pending) pendingMic = null;
      throw failureFromMic(error);
    }
    if (quiet || closing) {
      for (const track of stream.getTracks()) track.stop();
      pending.context.close().catch(() => undefined);
      if (pendingMic === pending) pendingMic = null;
      return;
    }
    await pending.context.resume();
    const mute = pending.context.createGain();
    mute.gain.value = 0;
    const source = pending.context.createMediaStreamSource(stream);
    let worklet: AudioWorkletNode | null = null;
    let processor: ScriptProcessorNode | null = null;
    try {
      await pending.context.audioWorklet.addModule(workletModuleUrl());
      worklet = new AudioWorkletNode(pending.context, 'agri-capture');
      worklet.port.onmessage = (event: MessageEvent<CaptureFrame>) => onCaptureFrame(event.data);
      source.connect(worklet);
      worklet.connect(mute);
    } catch {
      worklet?.disconnect();
      worklet = null;
      processor = pending.context.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (event) => {
        const samples = event.inputBuffer.getChannelData(0);
        onCaptureFrame({
          level: rms(samples),
          pcm: floatToPcm16(downsample(samples, pending.context.sampleRate, INPUT_RATE)),
        });
      };
      source.connect(processor);
      processor.connect(mute);
    }
    mute.connect(pending.context.destination);
    capture = { context: pending.context, stream, processor, worklet };
    pendingMic = null;
    capturing = true;
  }

  function releaseMic(): void {
    capturing = false;
    lastLevelAt = 0;
    emit({ type: 'level', level: 0 });
    const pending = pendingMic;
    pendingMic = null;
    if (pending) void abandonPending(pending);
    if (!capture) return;
    if (capture.processor) capture.processor.onaudioprocess = null;
    capture.worklet?.port.close();
    capture.worklet?.disconnect();
    capture.context.close().catch(() => undefined);
    for (const track of capture.stream.getTracks()) track.stop();
    capture = null;
  }

  const provider: VoiceProvider = {
    handlesTurns: true,
    async start() {
      if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
        throw new VoiceFailure('unsupported');
      }
      quiet = false;
      closing = false;
      ensurePlayer().prepare();
      let pending: PendingMic | null = null;
      try {
        pending = beginCapture();
        await ensureSocket();
        if (quiet || closing) {
          await abandonPending(pending);
          return;
        }
        await finishCapture(pending);
      } catch (error) {
        await abandonPending(pending);
        releaseMic();
        throw error instanceof VoiceFailure ? error : failureFromMic(error);
      }
    },
    stop() {
      capturing = false;
      try {
        socket?.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        // socket already closed
      }
      releaseMic();
    },
    suspend() {
      quiet = true;
      haltPlayback();
      releaseMic();
      player?.suspendOutput();
    },
    dispose() {
      closing = true;
      quiet = true;
      socketGen += 1;
      const current = player;
      player = null;
      void current?.close();
      releaseMic();
      try {
        socket?.close();
      } catch {
        // already closed
      }
      socket = null;
    },
    sendText(text: string) {
      quiet = false;
      allowPlayback();
      socket?.sendClientContent({ turns: text, turnComplete: true });
    },
    bargeIn() {
      haltPlayback();
    },
    setMode(next: VoiceMode) {
      mode = next;
    },
    speak() {
      return undefined;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return provider;
}

function rms(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}
