/**
 * Gapless playback for Gemini Live output: raw 16-bit PCM at 24 kHz.
 * The context is created at 24 kHz when the browser allows it. Otherwise each
 * chunk is resampled into the context's native rate so buffer boundaries do
 * not click. Chunks are scheduled back-to-back on the audio clock.
 */

export const OUTPUT_RATE = 24000;
export const INPUT_RATE = 16000;
/** Small lead so the next chunk can be queued before the first one ends. */
export const START_LEAD_SEC = 0.06;
/** Wait briefly before declaring the queue empty, so a late chunk does not end the turn. */
export const IDLE_GRACE_MS = 90;

export interface PcmSource {
  buffer: AudioBuffer | null;
  connect: (destination: unknown) => void;
  start: (when: number) => void;
  stop: () => void;
  onended: (() => void) | null;
}

export interface PcmContext {
  currentTime: number;
  sampleRate: number;
  state: AudioContextState;
  destination: unknown;
  resume: () => Promise<void>;
  suspend: () => Promise<void>;
  close: () => Promise<void>;
  createBuffer: (channels: number, length: number, sampleRate: number) => AudioBuffer;
  createBufferSource: () => PcmSource;
}

export type ContextFactory = (sampleRate: number) => PcmContext;

export function scheduleStart(nextTime: number, currentTime: number, lead = START_LEAD_SEC): number {
  if (nextTime <= currentTime + 0.005) return currentTime + lead;
  return nextTime;
}

export function floatToPcm16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    pcm[i] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
  }
  return pcm;
}

export function pcm16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  return bytesToBase64(bytes);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    const end = Math.min(i + step, bytes.length);
    let piece = '';
    for (let j = i; j < end; j += 1) piece += String.fromCharCode(bytes[j] ?? 0);
    binary += piece;
  }
  return btoa(binary);
}

export function base64ToPcm16(base64: string): Int16Array {
  const binary = atob(base64);
  const length = binary.length - (binary.length % 2);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

export function downsample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate || input.length === 0 || outputRate <= 0 || inputRate < outputRate) return input;
  const ratio = inputRate / outputRate;
  const length = Math.max(0, Math.floor(input.length / ratio));
  const result = new Float32Array(length);
  const last = input.length - 1;
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    const left = input[index] ?? 0;
    const right = input[Math.min(index + 1, last)] ?? left;
    result[i] = left + (right - left) * fraction;
  }
  return result;
}

function browserContext(sampleRate: number): PcmContext {
  const Ctx = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error('AudioContext unavailable');
  try {
    return new Ctx({ sampleRate, latencyHint: 'interactive' }) as PcmContext;
  } catch {
    return new Ctx() as PcmContext;
  }
}

export class PcmPlayer {
  private context: PcmContext | null = null;
  private nextTime = 0;
  private sources: PcmSource[] = [];
  private epoch = 0;
  private idleTimer = 0;
  private chain: Promise<void> = Promise.resolve();
  private readonly onIdle: () => void;
  private readonly factory: ContextFactory;

  constructor(hooks: { onIdle: () => void; factory?: ContextFactory }) {
    this.onIdle = hooks.onIdle;
    this.factory = hooks.factory ?? browserContext;
  }

  /** Create and resume the output context during the user gesture, before any await. */
  prepare(): void {
    const context = this.ensure();
    if (context.state === 'suspended') void context.resume();
  }

  get sampleRate(): number {
    return this.context?.sampleRate ?? OUTPUT_RATE;
  }

  enqueue(base64: string): void {
    const epoch = this.epoch;
    const context = this.ensure();
    if (context.state === 'running') {
      this.play(context, base64, epoch);
      return;
    }
    this.chain = this.chain.then(async () => {
      if (epoch !== this.epoch) return;
      if (context.state !== 'running') await context.resume();
      if (epoch !== this.epoch) return;
      this.play(context, base64, epoch);
    }).catch(() => undefined);
  }

  suspendOutput(): void {
    this.stop();
    const context = this.context;
    if (context && context.state === 'running') void context.suspend();
  }

  stop(): void {
    this.epoch += 1;
    this.clearIdle();
    this.nextTime = 0;
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    this.sources = [];
  }

  async close(): Promise<void> {
    this.stop();
    const context = this.context;
    this.context = null;
    if (!context) return;
    await context.close().catch(() => undefined);
  }

  private ensure(): PcmContext {
    if (!this.context) this.context = this.factory(OUTPUT_RATE);
    return this.context;
  }

  private play(context: PcmContext, base64: string, epoch: number): void {
    if (epoch !== this.epoch) return;
    let pcm: Int16Array;
    try {
      pcm = base64ToPcm16(base64);
    } catch {
      return;
    }
    if (pcm.length === 0) return;
    const buffer = bufferFor(context, pcm);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const startAt = scheduleStart(this.nextTime, context.currentTime);
    try {
      source.start(startAt);
    } catch {
      return;
    }
    this.nextTime = startAt + buffer.duration;
    this.sources.push(source);
    this.clearIdle();
    source.onended = () => {
      if (epoch !== this.epoch) return;
      this.sources = this.sources.filter((item) => item !== source);
      if (this.sources.length === 0) this.armIdle(epoch);
    };
  }

  private armIdle(epoch: number): void {
    this.clearIdle();
    this.idleTimer = setTimeout(() => {
      this.idleTimer = 0;
      if (epoch !== this.epoch || this.sources.length > 0) return;
      this.nextTime = 0;
      this.onIdle();
    }, IDLE_GRACE_MS) as unknown as number;
  }

  private clearIdle(): void {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = 0;
  }
}

function bufferFor(context: PcmContext, pcm: Int16Array): AudioBuffer {
  const rate = context.sampleRate;
  if (Math.abs(rate - OUTPUT_RATE) < 1) {
    const buffer = context.createBuffer(1, pcm.length, OUTPUT_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i += 1) channel[i] = (pcm[i] ?? 0) / 32768;
    return buffer;
  }
  const ratio = rate / OUTPUT_RATE;
  const length = Math.max(1, Math.floor(pcm.length * ratio));
  const buffer = context.createBuffer(1, length, rate);
  const channel = buffer.getChannelData(0);
  const last = pcm.length - 1;
  for (let i = 0; i < length; i += 1) {
    const position = i / ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    const left = (pcm[Math.min(index, last)] ?? 0) / 32768;
    const right = (pcm[Math.min(index + 1, last)] ?? 0) / 32768;
    channel[i] = left + (right - left) * fraction;
  }
  return buffer;
}
