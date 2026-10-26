import { describe, expect, it, vi } from 'vitest';
import { createVoiceSession } from './session';
import type { ProviderEvent, VoiceMode, VoiceProvider } from './types';

class LiveFake implements VoiceProvider {
  handlesTurns = true;
  starts = 0;
  private listeners = new Set<(event: ProviderEvent) => void>();

  start(): Promise<void> {
    this.starts += 1;
    return Promise.resolve();
  }

  stop(): void { return undefined; }
  bargeIn(): void { return undefined; }
  setMode(_mode: VoiceMode): void { return undefined; }
  speak(): void { return undefined; }

  emit(event: ProviderEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  subscribe(listener: (event: ProviderEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

describe('a provider that owns the turn', () => {
  it('does not call the text reply path', async () => {
    const provider = new LiveFake();
    const reply = vi.fn();
    const heard: string[] = [];
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      reply,
      onUser: (text) => { heard.push(text); },
    });
    await session.start();
    provider.emit({ type: 'final', text: 'How often should I water wheat?' });
    provider.emit({ type: 'assistant', text: 'Every seven to ten days.' });
    provider.emit({ type: 'speech-start' });
    provider.emit({ type: 'speech-end' });
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    expect(reply).not.toHaveBeenCalled();
    expect(heard).toEqual(['How often should I water wheat?']);
    expect(session.getState().phase).toBe('idle');
    session.dispose();
  });
});
