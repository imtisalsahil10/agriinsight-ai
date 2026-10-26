import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai';
import { loadFarm } from '../farm/store';
import { voiceFor } from '../i18n';
import { runTool, toolDeclarations } from '../tools/registry';
import type { Language } from '../../types';
import { VoiceFailure } from './errors';
import type { ProviderEvent, VoiceMode, VoiceProvider } from './types';

/**
 * Gemini Live in the browser.
 * Model: gemini-3.8-live
 * API version: v1beta
 * SDK: new GoogleGenAI({ apiKey: ephemeralToken, apiVersion: 'v1beta' })
 *      ai.live.connect({ model: 'gemini-3.8-live', config, callbacks })
 * Input audio: raw 16-bit little-endian PCM at 16 kHz via sendRealtimeInput({ audio })
 * Output audio: raw 16-bit little-endian PCM at 24 kHz from message.data
 * Server voice activity detection stays on. activityStart is not sent, because the
 * SDK only allows it when automatic activity detection is disabled.
 * Button barge-in stops local playback and calls sendClientContent({ turnComplete: true }).
 */

const LIVE_MODEL = 'gemini-3.8-live';
const LIVE_API_VERSION = 'v1beta';
const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;

export interface GeminiLiveOptions {
  language: () => Language;
}

interface Capture {
  context: AudioContext;
  stream: MediaStream;
  processor: ScriptProcessorNode;
}

export function createGeminiLiveProvider(options: GeminiLiveOptions): VoiceProvider {
  const listeners = new Set<(event: ProviderEvent) => void>();
  let mode: VoiceMode = 'push-to-talk';
  let socket: Session | null = null;
  let opening: Promise<void> | null = null;
  let capture: Capture | null = null;
  let player: PcmPlayer | null = null;
  let quiet = false;
  let closing = false;
  let capturing = false;
  let inputText = '';
  let outputText = '';
  let finalSent = false;
  let turnDone = false;
  let playing = false;
  let toolsInFlight = 0;
  let resumeHandle = '';

  function emit(event: ProviderEvent): void {
    for (const listener of listeners) listener(event);
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

  function resetTurn(): void {
    inputText = '';
    outputText = '';
    finalSent = false;
    turnDone = false;
    playing = false;
  }

  function commitInput(): void {
    if (finalSent || quiet) return;
    finalSent = true;
    emit({ type: 'final', text: inputText.trim() || '…' });
  }

  function finishIfIdle(): void {
    if (quiet || !turnDone || playing || toolsInFlight > 0) return;
    emit({ type: 'speech-end' });
    resetTurn();
  }

  async function onMessage(message: LiveServerMessage): Promise<void> {
    if (quiet) return;
    const content = message.serverContent;
    if (content?.interrupted) {
      player?.stop();
      playing = false;
    }
    if (content?.inputTranscription?.text) {
      inputText = mergeText(inputText, content.inputTranscription.text);
      if (!finalSent) emit({ type: 'partial', text: inputText });
    }
    if (content?.outputTranscription?.text) {
      commitInput();
      outputText = mergeText(outputText, content.outputTranscription.text);
      emit({ type: 'assistant', text: outputText });
    }
    const audio = message.data;
    if (audio) {
      commitInput();
      if (!playing) {
        playing = true;
        emit({ type: 'speech-start' });
      }
      player?.enqueue(audio);
    }
    if (message.toolCall?.functionCalls?.length) {
      toolsInFlight += 1;
      const calls = message.toolCall.functionCalls;
      try {
        const responses = [];
        for (const call of calls) {
          const name = call.name ?? 'unknown';
          const result = await runTool(name, call.args ?? {});
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
    if (message.sessionResumptionUpdate?.newHandle) {
      resumeHandle = message.sessionResumptionUpdate.newHandle;
    }
    if (content?.turnComplete) {
      turnDone = true;
      if (!finalSent) commitInput();
      finishIfIdle();
    }
  }

  async function connect(): Promise<void> {
    if (socket) return;
    const response = await fetch('/api/live-token', { method: 'POST' });
    const body = await response.json().catch(() => ({})) as { token?: string };
    if (!response.ok || !body.token) {
      throw new VoiceFailure('network');
    }
    const ai = new GoogleGenAI({
      apiKey: body.token,
      apiVersion: LIVE_API_VERSION,
      httpOptions: { apiVersion: LIVE_API_VERSION },
    });
    const language = options.language();
    player = player ?? new PcmPlayer({
      onIdle: () => {
        playing = false;
        finishIfIdle();
      },
    });
    socket = await ai.live.connect({
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
          void onMessage(message);
        },
        onerror: () => {
          if (!closing) emit({ type: 'error', code: 'network' });
        },
        onclose: () => {
          socket = null;
          if (!closing) emit({ type: 'error', code: 'network' });
        },
      },
    });
  }

  async function openMic(): Promise<void> {
    if (capture || !navigator.mediaDevices?.getUserMedia) {
      if (!navigator.mediaDevices?.getUserMedia) throw new VoiceFailure('unsupported');
      capturing = true;
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const context = new AudioContext();
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const mute = context.createGain();
    mute.gain.value = 0;
    processor.onaudioprocess = (event) => {
      if (!capturing || !socket || quiet) return;
      const samples = event.inputBuffer.getChannelData(0);
      emit({ type: 'level', level: rms(samples) });
      const pcm = downsample(samples, context.sampleRate, INPUT_RATE);
      if (pcm.length === 0) return;
      socket.sendRealtimeInput({
        audio: { data: pcm16Base64(pcm), mimeType: 'audio/pcm;rate=16000' },
      });
    };
    source.connect(processor);
    processor.connect(mute);
    mute.connect(context.destination);
    capture = { context, stream, processor };
    capturing = true;
  }

  function releaseMic(): void {
    capturing = false;
    emit({ type: 'level', level: 0 });
    if (!capture) return;
    capture.processor.onaudioprocess = null;
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
      if (!socket) {
        if (!opening) {
          opening = connect().finally(() => {
            opening = null;
          });
        }
        await opening;
      }
      resetTurn();
      await openMic();
    },
    stop() {
      if (mode === 'hands-free') return;
      capturing = false;
      socket?.sendRealtimeInput({ audioStreamEnd: true });
      releaseMic();
    },
    suspend() {
      quiet = true;
      player?.stop();
      playing = false;
      releaseMic();
    },
    dispose() {
      closing = true;
      quiet = true;
      player?.stop();
      releaseMic();
      socket?.close();
      socket = null;
      player = null;
    },
    sendText(text: string) {
      quiet = false;
      socket?.sendClientContent({ turns: text, turnComplete: true });
    },
    bargeIn() {
      player?.stop();
      playing = false;
      if (quiet || !socket) return;
      socket.sendClientContent({ turnComplete: true });
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

function mergeText(current: string, piece: string): string {
  if (!piece) return current;
  if (!current || piece.startsWith(current)) return piece;
  if (current.endsWith(piece)) return current;
  return current + piece;
}

function rms(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}

function downsample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const length = Math.floor(input.length / ratio);
  const result = new Float32Array(length);
  for (let i = 0; i < length; i += 1) result[i] = input[Math.floor(i * ratio)] ?? 0;
  return result;
}

function pcm16Base64(samples: Float32Array): string {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

class PcmPlayer {
  private context: AudioContext | null = null;
  private nextTime = 0;
  private sources: AudioBufferSourceNode[] = [];
  private readonly onIdle: () => void;

  constructor(hooks: { onIdle: () => void }) {
    this.onIdle = hooks.onIdle;
  }

  enqueue(base64: string): void {
    const context = this.context ?? new AudioContext();
    this.context = context;
    void context.resume();
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const buffer = context.createBuffer(1, pcm.length, OUTPUT_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i += 1) channel[i] = (pcm[i] ?? 0) / 32768;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const startAt = Math.max(context.currentTime, this.nextTime);
    source.start(startAt);
    this.nextTime = startAt + buffer.duration;
    this.sources.push(source);
    source.onended = () => {
      this.sources = this.sources.filter((item) => item !== source);
      if (this.sources.length === 0) this.onIdle();
    };
  }

  stop(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    this.sources = [];
    this.nextTime = 0;
  }
}
