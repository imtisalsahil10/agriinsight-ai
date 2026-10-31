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

  stops = 0;
  mode: VoiceMode = 'push-to-talk';
  suspended = false;

  stop(): void {
    this.stops += 1;
  }

  suspend(): void {
    this.suspended = true;
  }
  bargeIn(): void { return undefined; }
  setMode(mode: VoiceMode): void {
    this.mode = mode;
  }
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

  it('does not save the same spoken answer twice', async () => {
    const provider = new LiveFake();
    const saved: string[] = [];
    const session = createVoiceSession({
      provider,
      language: () => 'hi-IN',
      history: () => [],
      reply: vi.fn(),
      onAssistant: (result) => { saved.push(result.text); },
      mode: 'hands-free',
    });
    await session.start();
    const answer = 'ज्वार एक प्रमुख अनाज है, जिसे कई इलाकों में सोरघम भी कहा जाता है। यह ग्लूटेन-फ्री होता है।';
    provider.emit({ type: 'final', text: 'ज्वार क्या है' });
    provider.emit({ type: 'assistant', text: answer });
    provider.emit({ type: 'speech-start' });
    provider.emit({ type: 'speech-end' });
    provider.emit({ type: 'final', text: 'गेहूं के बारे में बताओ' });
    provider.emit({ type: 'assistant', text: `${answer} इसका इस्तेमाल रोटी बनाने में किया जाता है।` });
    provider.emit({ type: 'speech-start' });
    provider.emit({ type: 'speech-end' });
    expect(saved).toEqual([answer]);
    expect(session.getState().assistantText).toBe('');
    session.dispose();
  });

  it('leaves hands-free and returns to idle when push to talk is selected', async () => {
    const provider = new LiveFake();
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      reply: vi.fn(),
      mode: 'hands-free',
    });
    await session.start();
    session.setMode('push-to-talk');
    expect(provider.mode).toBe('push-to-talk');
    expect(provider.suspended).toBe(true);
    expect(session.getState().mode).toBe('push-to-talk');
    expect(session.getState().phase).toBe('idle');
    session.dispose();
  });
});
