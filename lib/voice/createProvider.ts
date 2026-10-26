import type { Language } from '../../types';
import { createFallbackProvider } from './fallbackProvider';
import { createGeminiLiveProvider } from './geminiLiveProvider';
import type { ProviderEvent, VoiceMode, VoiceProvider } from './types';

export interface VoiceProviderOptions {
  language: () => Language;
  lowBandwidth: () => boolean;
}

export interface ProviderFactories {
  createLive: () => VoiceProvider;
  createFallback: () => VoiceProvider;
}

/**
 * Tries Gemini Live. A token failure, a missing audio API, or an error while
 * connecting falls through to Web Speech plus the text model.
 * Low bandwidth skips Live.
 */
export function createVoiceProvider(options: VoiceProviderOptions): VoiceProvider {
  return createCompositeProvider(options, {
    createLive: () => createGeminiLiveProvider({ language: options.language }),
    createFallback: () => createFallbackProvider({ language: options.language }),
  });
}

export function createCompositeProvider(options: VoiceProviderOptions, factories: ProviderFactories): VoiceProvider {
  const live = factories.createLive();
  const fallback = factories.createFallback();
  let chosen: 'live' | 'fallback' | 'none' = 'none';
  const listeners = new Set<(event: ProviderEvent) => void>();

  live.subscribe((event) => {
    if (chosen === 'live') forward(event);
  });
  fallback.subscribe((event) => {
    if (chosen !== 'live') forward(event);
  });

  function forward(event: ProviderEvent): void {
    for (const listener of listeners) listener(event);
  }

  const provider: VoiceProvider = {
    get handlesTurns() {
      return chosen === 'live' && live.handlesTurns === true;
    },
    async start() {
      if (chosen === 'live') {
        await live.start();
        return;
      }
      if (chosen === 'fallback') {
        await fallback.start();
        return;
      }
      if (options.lowBandwidth()) {
        chosen = 'fallback';
        await fallback.start();
        return;
      }
      try {
        await live.start();
        chosen = 'live';
      } catch {
        chosen = 'fallback';
        await fallback.start();
      }
    },
    stop() {
      (chosen === 'live' ? live : fallback).stop();
    },
    suspend() {
      const active = chosen === 'live' ? live : fallback;
      if (active.suspend) active.suspend();
      else active.bargeIn();
    },
    dispose() {
      live.dispose?.();
      fallback.bargeIn();
    },
    bargeIn() {
      (chosen === 'live' ? live : fallback).bargeIn();
    },
    setMode(mode: VoiceMode) {
      live.setMode(mode);
      fallback.setMode(mode);
    },
    speak(text, language) {
      if (chosen === 'live') return;
      fallback.speak(text, language);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  Object.defineProperty(provider, 'sendText', {
    configurable: true,
    enumerable: false,
    get() {
      if (chosen !== 'live' || !live.sendText) return undefined;
      return (text: string) => live.sendText?.(text);
    },
  });

  return provider;
}
