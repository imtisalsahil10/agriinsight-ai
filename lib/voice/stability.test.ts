import { describe, expect, it, vi } from 'vitest';
import { voiceFor } from '../i18n';
import { statusLine, voiceCopy } from './copy';
import { failureFromMic } from './errors';
import { shouldReleaseVoice } from './lifecycle';
import { reconnectDelayMs, socketClosePlan } from './reconnect';
import { createVoiceSession } from './session';
import { affectsPresentation, initialState, transition } from './sessionMachine';
import type { ProviderEvent, VoiceMode, VoiceProvider } from './types';
import { createCompositeProvider } from './createProvider';
import { VoiceFailure } from './errors';

class ScriptedProvider implements VoiceProvider {
  handlesTurns = true;
  starts = 0;
  stops = 0;
  barges = 0;
  suspended = 0;
  disposed = 0;
  private gate: Promise<void> | null = null;
  private releaseGate: (() => void) | null = null;
  private listeners = new Set<(event: ProviderEvent) => void>();

  holdNextStart(): void {
    this.gate = new Promise((resolve) => {
      this.releaseGate = resolve;
    });
  }

  releaseStart(): void {
    this.releaseGate?.();
    this.gate = null;
  }

  start(): Promise<void> {
    this.starts += 1;
    return this.gate ?? Promise.resolve();
  }

  stop(): void { this.stops += 1; }
  bargeIn(): void { this.barges += 1; }
  suspend(): void { this.suspended += 1; }
  dispose(): void { this.disposed += 1; }
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

describe('voice session stability', () => {
  it('shows connecting immediately and listens once the provider opens', async () => {
    const provider = new ScriptedProvider();
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      reply: vi.fn(),
    });
    provider.holdNextStart();
    const pending = session.start();
    expect(session.getState().connection).toBe('connecting');
    expect(session.getState().phase).toBe('idle');
    provider.releaseStart();
    await pending;
    expect(session.getState().connection).toBe('open');
    expect(session.getState().phase).toBe('listening');
    session.dispose();
  });

  it('ignores a second start while the first is still opening', async () => {
    const provider = new ScriptedProvider();
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      reply: vi.fn(),
    });
    provider.holdNextStart();
    const first = session.start();
    const second = session.start();
    provider.releaseStart();
    await first;
    await second;
    expect(provider.starts).toBe(1);
    session.dispose();
  });

  it('stops playback and ignores events after dispose', async () => {
    const provider = new ScriptedProvider();
    const session = createVoiceSession({
      provider,
      language: () => 'hi-IN',
      history: () => [],
      reply: vi.fn(),
    });
    await session.start();
    provider.emit({ type: 'final', text: 'गेहूं को पानी कब दें' });
    session.dispose();
    provider.emit({ type: 'assistant', text: 'यह बाद में आया' });
    expect(session.getState().assistantText).toBe('');
    expect(provider.suspended).toBeGreaterThan(0);
    expect(provider.disposed).toBe(1);
  });

  it('does not run the same final twice', async () => {
    const provider = new ScriptedProvider();
    const heard: string[] = [];
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      reply: vi.fn(),
      onUser: (text) => { heard.push(text); },
    });
    await session.start();
    provider.emit({ type: 'final', text: 'Open soil analysis' });
    provider.emit({ type: 'final', text: 'Open soil analysis' });
    expect(heard).toEqual(['Open soil analysis']);
    session.dispose();
  });

  it('stop suspends the provider and a late callback cannot leave the session speaking', async () => {
    const provider = new ScriptedProvider();
    const session = createVoiceSession({
      provider,
      language: () => 'en-US',
      history: () => [],
      reply: vi.fn(),
    });
    await session.start();
    provider.emit({ type: 'final', text: 'hello' });
    provider.emit({ type: 'speech-start' });
    session.stop();
    provider.emit({ type: 'assistant', text: 'still talking' });
    provider.emit({ type: 'speech-end' });
    expect(session.getState().phase).toBe('idle');
    expect(session.getState().assistantText).not.toBe('still talking');
    expect(provider.suspended).toBe(1);
    expect(provider.barges).toBeGreaterThan(0);
    session.dispose();
  });

  it('surfaces reconnecting without leaving the current phase', () => {
    let state = initialState();
    state = transition(state, { type: 'start' }).state;
    state = transition(state, { type: 'connection', status: 'reconnecting' }).state;
    expect(state.phase).toBe('listening');
    expect(state.connection).toBe('reconnecting');
    expect(statusLine(voiceCopy('en-US'), state.phase, null, state.connection)).toBe('Reconnecting…');
    expect(statusLine(voiceCopy('hi-IN'), state.phase, null, 'connecting')).toBe('कनेक्ट हो रहा है…');
    state = transition(state, { type: 'connection', status: 'open' }).state;
    expect(state.connection).toBe('open');
  });
});

describe('microphone and fallback', () => {
  it('maps a denied microphone to a permission error', () => {
    const denied = new DOMException('denied', 'NotAllowedError');
    expect(failureFromMic(denied).code).toBe('not-allowed');
    expect(failureFromMic(new DOMException('missing', 'NotFoundError')).code).toBe('audio-capture');
  });

  it('does not start Web Speech when the microphone is blocked', async () => {
    const live: VoiceProvider = {
      handlesTurns: true,
      start: () => Promise.reject(new VoiceFailure('not-allowed')),
      stop: () => undefined,
      dispose: () => undefined,
      bargeIn: () => undefined,
      setMode: () => undefined,
      speak: () => undefined,
      subscribe: () => () => undefined,
    };
    const fallback = { ...live, handlesTurns: false, start: vi.fn(async () => undefined) };
    const provider = createCompositeProvider(
      { language: () => 'en-US', lowBandwidth: () => false },
      { createLive: () => live, createFallback: () => fallback },
    );
    await expect(provider.start()).rejects.toMatchObject({ code: 'not-allowed' });
    expect(fallback.start).not.toHaveBeenCalled();
  });

  it('uses the Hindi voice for Hindi and the English voice for English', () => {
    expect(voiceFor('en-US')).toBe('Charon');
    expect(voiceFor('hi-IN')).toBe('Kore');
  });
});

describe('navigation and render filtering', () => {
  it('releases voice only when leaving Talk', () => {
    expect(shouldReleaseVoice('voice', 'dashboard')).toBe(true);
    expect(shouldReleaseVoice('voice', 'voice')).toBe(false);
    expect(shouldReleaseVoice('dashboard', 'soil')).toBe(false);
  });

  it('ignores audio level when deciding whether the page should render', () => {
    const current = initialState();
    const louder = { ...current, audioLevel: 0.8 };
    expect(affectsPresentation(current, louder)).toBe(false);
    expect(affectsPresentation(current, { ...current, phase: 'listening' })).toBe(true);
  });

  it('waits longer between later reconnect attempts', () => {
    expect(socketClosePlan({ closing: false, quiet: false, recovering: false })).toBe('reconnect');
    expect(socketClosePlan({ closing: true, quiet: false, recovering: false })).toBe('ignore');
    expect(socketClosePlan({ closing: false, quiet: true, recovering: false })).toBe('ignore');
    expect(reconnectDelayMs(1)).toBeLessThan(reconnectDelayMs(3));
  });
});
