import { describe, expect, it } from 'vitest';
import { createCompositeProvider } from './createProvider';
import type { ProviderEvent, VoiceMode, VoiceProvider } from './types';

function fake(handlesTurns = false): VoiceProvider & { starts: number } {
  return {
    handlesTurns,
    starts: 0,
    start() {
      this.starts += 1;
      return Promise.resolve();
    },
    stop() { return undefined; },
    bargeIn() { return undefined; },
    setMode(_mode: VoiceMode) { return undefined; },
    speak() { return undefined; },
    subscribe(_listener: (event: ProviderEvent) => void) {
      return () => undefined;
    },
  };
}

describe('voice provider choice', () => {
  it('falls back when Live cannot connect', async () => {
    const live = fake(true);
    live.start = () => Promise.reject(new Error('token'));
    const fallback = fake(false);
    const provider = createCompositeProvider(
      { language: () => 'en-US', lowBandwidth: () => false },
      { createLive: () => live, createFallback: () => fallback },
    );
    await provider.start();
    expect(provider.handlesTurns).toBe(false);
    expect(fallback.starts).toBe(1);
  });

  it('skips Live when low bandwidth is on', async () => {
    const live = fake(true);
    const fallback = fake(false);
    const provider = createCompositeProvider(
      { language: () => 'en-US', lowBandwidth: () => true },
      { createLive: () => live, createFallback: () => fallback },
    );
    await provider.start();
    expect(live.starts).toBe(0);
    expect(fallback.starts).toBe(1);
  });

  it('keeps Live when the socket opens', async () => {
    const live = fake(true);
    const fallback = fake(false);
    const provider = createCompositeProvider(
      { language: () => 'en-US', lowBandwidth: () => false },
      { createLive: () => live, createFallback: () => fallback },
    );
    await provider.start();
    expect(provider.handlesTurns).toBe(true);
    expect(live.starts).toBe(1);
    expect(fallback.starts).toBe(0);
  });
});
