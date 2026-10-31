import { describe, expect, it, vi } from 'vitest';
import { createVoiceSession } from './session';
import type { ProviderEvent, VoiceMode, VoiceProvider } from './types';

class FakeProvider implements VoiceProvider {
  spoken: string[] = [];
  replies = 0;
  private listeners = new Set<(event: ProviderEvent) => void>();

  start(): Promise<void> {
    return Promise.resolve();
  }
  stop(): void { return undefined; }
  bargeIn(): void { return undefined; }
  setMode(_mode: VoiceMode): void { return undefined; }
  speak(text: string): void {
    this.spoken.push(text);
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
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('structured voice commands', () => {
  it('speaks the page result and does not call the chat model', async () => {
    const provider = new FakeProvider();
    const reply = vi.fn(async () => ({ text: 'from the model', sources: [] }));
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      reply,
      classify: (text) => text.startsWith('go'),
      intercept: async () => ({ action: 'reply', text: 'Opened soil analysis.' }),
    });
    await session.start();
    provider.emit({ type: 'final', text: 'go to soil' });
    await flush();
    expect(reply).not.toHaveBeenCalled();
    expect(provider.spoken.join(' ')).toMatch(/Opened soil analysis/);
    session.dispose();
  });

  it('stop cancels playback and does not report success', async () => {
    const provider = new FakeProvider();
    const reply = vi.fn(async () => ({ text: 'should not speak', sources: [] }));
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      reply,
      classify: () => true,
      intercept: async () => ({ action: 'stop' }),
    });
    await session.start();
    provider.emit({ type: 'final', text: 'stop speaking' });
    await flush();
    expect(reply).not.toHaveBeenCalled();
    expect(provider.spoken).toEqual([]);
    expect(session.getState().phase).toBe('idle');
    session.dispose();
  });
});
