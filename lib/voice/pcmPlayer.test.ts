import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  base64ToPcm16,
  downsample,
  floatToPcm16,
  IDLE_GRACE_MS,
  OUTPUT_RATE,
  pcm16ToBase64,
  PcmPlayer,
  scheduleStart,
  type PcmContext,
  type PcmSource,
} from './pcmPlayer';

class FakeSource implements PcmSource {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  startedAt: number | null = null;
  stopped = false;

  connect(): void { return undefined; }

  start(when: number): void {
    this.startedAt = when;
  }

  stop(): void {
    this.stopped = true;
  }
}

function fakeContext(sampleRate = OUTPUT_RATE): PcmContext & { sources: FakeSource[] } {
  const sources: FakeSource[] = [];
  const context: PcmContext & { sources: FakeSource[] } = {
    sources,
    currentTime: 0,
    sampleRate,
    state: 'running',
    destination: {},
    resume: vi.fn(async () => undefined),
    suspend: vi.fn(async () => {
      context.state = 'suspended';
    }),
    close: vi.fn(async () => undefined),
    createBuffer(channels, length, rate) {
      const data = [new Float32Array(length)];
      return {
        duration: length / rate,
        length,
        numberOfChannels: channels,
        sampleRate: rate,
        getChannelData: (index: number) => data[index] ?? data[0],
        copyFromChannel: () => undefined,
        copyToChannel: () => undefined,
      } as AudioBuffer;
    },
    createBufferSource() {
      const source = new FakeSource();
      sources.push(source);
      return source;
    },
  };
  return context;
}

describe('pcm playback scheduling', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('places consecutive chunks back to back', () => {
    const context = fakeContext();
    const player = new PcmPlayer({ onIdle: () => undefined, factory: () => context });
    const frame = pcm16ToBase64(floatToPcm16(new Float32Array(480)));
    player.enqueue(frame);
    player.enqueue(frame);
    player.enqueue(frame);
    const [first, second, third] = context.sources;
    expect(first?.startedAt).toBeLessThan(second?.startedAt ?? 0);
    expect(second?.startedAt).toBeCloseTo((first?.startedAt ?? 0) + (480 / OUTPUT_RATE), 5);
    expect(third?.startedAt).toBeCloseTo((second?.startedAt ?? 0) + (480 / OUTPUT_RATE), 5);
    const gap = (second?.startedAt ?? 0) - ((first?.startedAt ?? 0) + (480 / OUTPUT_RATE));
    expect(Math.abs(gap)).toBeLessThan(0.0001);
  });

  it('does not let a stopped chunk end the next utterance', () => {
    vi.useFakeTimers();
    const context = fakeContext();
    const idle = vi.fn();
    const player = new PcmPlayer({ onIdle: idle, factory: () => context });
    const frame = pcm16ToBase64(floatToPcm16(new Float32Array(240)));
    player.enqueue(frame);
    const stale = context.sources[0];
    player.stop();
    stale?.onended?.();
    vi.advanceTimersByTime(IDLE_GRACE_MS + 20);
    expect(idle).not.toHaveBeenCalled();
    player.enqueue(frame);
    expect(context.sources[1]?.stopped).toBe(false);
    expect(context.sources[1]?.startedAt).toBeGreaterThan(0);
  });

  it('suspends the output context without closing it', () => {
    const context = fakeContext();
    const player = new PcmPlayer({ onIdle: () => undefined, factory: () => context });
    player.prepare();
    player.suspendOutput();
    expect(context.suspend).toHaveBeenCalledTimes(1);
    expect(context.close).not.toHaveBeenCalled();
  });

  it('creates one output context at 24 kHz and resumes it', () => {
    const context = fakeContext();
    context.state = 'suspended';
    let built = 0;
    const player = new PcmPlayer({
      onIdle: () => undefined,
      factory: (rate) => {
        built += 1;
        expect(rate).toBe(OUTPUT_RATE);
        return context;
      },
    });
    player.prepare();
    player.prepare();
    expect(built).toBe(1);
    expect(context.resume).toHaveBeenCalledTimes(2);
    context.state = 'running';
    player.prepare();
    expect(context.resume).toHaveBeenCalledTimes(2);
  });

  it('keeps a closed session from reporting idle', async () => {
    vi.useFakeTimers();
    const context = fakeContext();
    const idle = vi.fn();
    const player = new PcmPlayer({ onIdle: idle, factory: () => context });
    player.enqueue(pcm16ToBase64(floatToPcm16(new Float32Array(240))));
    await player.close();
    context.sources[0]?.onended?.();
    vi.advanceTimersByTime(IDLE_GRACE_MS + 20);
    expect(idle).not.toHaveBeenCalled();
    expect(context.close).toHaveBeenCalledTimes(1);
  });
});

describe('pcm conversion', () => {
  it('round-trips 16-bit samples in order', () => {
    const input = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const decoded = base64ToPcm16(pcm16ToBase64(floatToPcm16(input)));
    expect(decoded.length).toBe(input.length);
    expect(decoded[0]).toBe(0);
    expect(decoded[1]).toBeGreaterThan(0);
    expect(decoded[2]).toBeLessThan(0);
    expect(decoded[3]).toBe(32767);
    expect(decoded[4]).toBe(-32768);
  });

  it('downsamples without changing the sample order', () => {
    const input = new Float32Array([0, 0, 0.5, 0.5, 1, 1]);
    const output = downsample(input, 48000, 16000);
    expect(output.length).toBe(2);
    expect(output[0]).toBeCloseTo(0, 5);
    expect(output[1]).toBeGreaterThan(output[0] ?? 0);
  });

  it('encodes a 100ms frame without a long main-thread stall', () => {
    const frame = new Float32Array(1600);
    for (let i = 0; i < frame.length; i += 1) frame[i] = Math.sin(i / 12) * 0.4;
    const rounds = 100;
    const started = performance.now();
    for (let i = 0; i < rounds; i += 1) pcm16ToBase64(floatToPcm16(frame));
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(150);
  });
});

describe('scheduleStart', () => {
  it('starts the first chunk slightly ahead of the clock and then abuts', () => {
    const first = scheduleStart(0, 10);
    const next = first + 0.2;
    const second = scheduleStart(next, 10.01);
    expect(first).toBeCloseTo(10.06, 5);
    expect(second).toBeCloseTo(next, 5);
  });
});
