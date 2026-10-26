import { afterEach, describe, expect, it, vi } from 'vitest';
import { voiceErrorMessage } from './errors';
import { createVoiceSession } from './session';
import type { ProviderEvent, ReplyRequest, ReplyResult, VoiceMode, VoiceProvider } from './types';

class FakeProvider implements VoiceProvider {
  spoken: string[] = [];
  starts = 0;
  stops = 0;
  barges = 0;
  mode: VoiceMode = 'push-to-talk';
  onSpeak: (() => void) | null = null;
  private listeners = new Set<(event: ProviderEvent) => void>();

  start(): Promise<void> {
    this.starts += 1;
    return Promise.resolve();
  }

  stop(): void {
    this.stops += 1;
  }

  bargeIn(): void {
    this.barges += 1;
  }

  setMode(mode: VoiceMode): void {
    this.mode = mode;
  }

  speak(text: string): void {
    this.spoken.push(text);
    this.onSpeak?.();
    this.emit({ type: 'speech-start' });
    queueMicrotask(() => this.emit({ type: 'speech-end' }));
  }

  emit(event: ProviderEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }

  subscribe(listener: (event: ProviderEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

describe('voice session with a fake provider', () => {
  const logs: string[] = [];
  let spy: ReturnType<typeof vi.spyOn> | null = null;

  afterEach(() => {
    spy?.mockRestore();
    spy = null;
    logs.length = 0;
  });

  function watchLogs(): void {
    spy = vi.spyOn(console, 'info').mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });
  }

  it('speaks a short reply, logs time-to-first-audio, and returns to idle', async () => {
    watchLogs();
    const provider = new FakeProvider();
    let clock = 1_000;
    const heard: string[] = [];
    const history = [{ role: 'user' as const, content: 'earlier' }];
    let seenPrior: ReplyRequest['history'] | null = null;
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => history,
      now: () => clock,
      onUser: (text) => {
        heard.push(text);
        history.push({ role: 'user', content: text });
      },
      reply: async (request) => {
        seenPrior = request.history;
        const text = 'Rain tonight.';
        request.onDelta(text);
        return { text, sources: [{ title: 'IMD', uri: 'https://example.com' }] };
      },
    });
    provider.onSpeak = () => {
      clock = 1_420;
    };

    await session.start();
    provider.emit({ type: 'partial', text: 'hel' });
    expect(session.getState().partialTranscript).toBe('hel');
    provider.emit({ type: 'final', text: 'hello' });
    await flush();

    expect(heard).toEqual(['hello']);
    expect(seenPrior).toEqual([{ role: 'user', content: 'earlier' }]);
    expect(provider.spoken).toEqual(['Rain tonight.']);
    expect(session.getState().phase).toBe('idle');
    const metric = logs.map((line) => JSON.parse(line) as { metric?: string; timeToFirstAudioMs?: number | null; toolDurationMs?: number | null })
      .find((entry) => entry.metric === 'voice_turn');
    expect(metric).toEqual({ metric: 'voice_turn', timeToFirstAudioMs: 420, toolDurationMs: null });
    session.dispose();
  });

  it('caps a long spoken answer and asks if the farmer wants more', async () => {
    const provider = new FakeProvider();
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      reply: async () => {
        const text = 'Water the field in the morning and check the leaves again. '.repeat(20);
        return { text, sources: [] };
      },
    });
    await session.start();
    provider.emit({ type: 'final', text: 'what should I do' });
    await flush();
    expect(provider.spoken[provider.spoken.length - 1]).toBe('Want more detail?');
    expect(provider.spoken.slice(0, -1).join(' ').length).toBeLessThanOrEqual(320);
    expect(session.getState().phase).toBe('idle');
    session.dispose();
  });

  it('barge-in aborts the reply and listens again', async () => {
    const provider = new FakeProvider();
    const captured: { signal: AbortSignal | null } = { signal: null };
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      reply: (request) => new Promise<ReplyResult>((_resolve, reject) => {
        captured.signal = request.signal;
        request.signal.addEventListener('abort', () => reject(abortError()));
      }),
    });
    await session.start();
    provider.emit({ type: 'final', text: 'hello' });
    expect(session.getState().phase).toBe('thinking');
    session.bargeIn();
    await flush();
    expect(captured.signal?.aborted).toBe(true);
    expect(provider.barges).toBeGreaterThan(0);
    expect(session.getState().phase).toBe('listening');
    expect(provider.starts).toBe(2);
    session.dispose();
  });

  it('speaks a silence error and does not keep hands-free listening', async () => {
    const provider = new FakeProvider();
    const session = createVoiceSession({
      provider,
      language: () => 'hi-IN',
      history: () => [],
      mode: 'hands-free',
      reply: async () => ({ text: 'unused', sources: [] }),
    });
    await session.start();
    provider.emit({ type: 'silence' });
    await flush();
    expect(provider.spoken).toEqual([voiceErrorMessage('no-speech', 'hi-IN')]);
    expect(session.getState().phase).toBe('idle');
    expect(session.getState().error).toBe(voiceErrorMessage('no-speech', 'hi-IN'));
    expect(provider.starts).toBe(1);
    session.dispose();
  });

  it('listens again after a hands-free reply', async () => {
    const provider = new FakeProvider();
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      mode: 'hands-free',
      reply: async () => ({ text: 'Rain tonight.', sources: [] }),
    });
    await session.start();
    provider.emit({ type: 'final', text: 'weather' });
    await flush();
    expect(session.getState().phase).toBe('listening');
    expect(provider.starts).toBe(2);
    session.dispose();
  });
});
