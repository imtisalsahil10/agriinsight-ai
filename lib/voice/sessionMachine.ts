import type { SessionState, VoiceMode } from './types';

export type MachineEvent =
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'partial'; text: string }
  | { type: 'heard'; text: string }
  | { type: 'silence'; message: string }
  | { type: 'assistant'; text: string }
  | { type: 'first-audio' }
  | { type: 'spoken-done' }
  | { type: 'barge-in' }
  | { type: 'fail'; message: string }
  | { type: 'level'; level: number }
  | { type: 'set-mode'; mode: VoiceMode };

export interface TransitionResult {
  state: SessionState;
  accepted: boolean;
}

export function initialState(mode: VoiceMode = 'push-to-talk'): SessionState {
  return {
    phase: 'idle',
    mode,
    partialTranscript: '',
    finalTranscript: '',
    assistantText: '',
    audioLevel: 0,
    error: null,
    announcingError: false,
  };
}

function ok(state: SessionState): TransitionResult {
  return { state, accepted: true };
}

function reject(state: SessionState): TransitionResult {
  return { state, accepted: false };
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.min(1, Math.max(0, level));
}

export function transition(state: SessionState, event: MachineEvent): TransitionResult {
  switch (event.type) {
    case 'set-mode':
      return ok({ ...state, mode: event.mode });
    case 'level':
      return ok({ ...state, audioLevel: clampLevel(event.level) });
    case 'stop':
      return ok({
        ...state,
        phase: 'idle',
        partialTranscript: '',
        audioLevel: 0,
        announcingError: false,
      });
    case 'start':
      if (state.phase !== 'idle') return reject(state);
      return ok({
        ...state,
        phase: 'listening',
        partialTranscript: '',
        finalTranscript: '',
        assistantText: '',
        error: null,
        announcingError: false,
        audioLevel: 0,
      });
    case 'partial':
      if (state.phase !== 'listening') return reject(state);
      return ok({ ...state, partialTranscript: event.text });
    case 'heard': {
      const text = event.text.trim();
      if (state.phase !== 'listening' || !text) return reject(state);
      return ok({
        ...state,
        phase: 'thinking',
        finalTranscript: text,
        partialTranscript: '',
        assistantText: '',
        error: null,
        announcingError: false,
      });
    }
    case 'assistant':
      if (state.announcingError) return reject(state);
      if (state.phase !== 'thinking' && state.phase !== 'speaking') return reject(state);
      return ok({ ...state, assistantText: event.text });
    case 'first-audio':
      if (state.phase !== 'thinking' && state.phase !== 'speaking') return reject(state);
      return ok({ ...state, phase: 'speaking' });
    case 'silence':
      if (state.phase !== 'listening') return reject(state);
      return ok({
        ...state,
        phase: 'speaking',
        partialTranscript: '',
        error: event.message,
        assistantText: event.message,
        announcingError: true,
        audioLevel: 0,
      });
    case 'fail':
      return ok({
        ...state,
        phase: 'speaking',
        partialTranscript: '',
        error: event.message,
        assistantText: event.message,
        announcingError: true,
        audioLevel: 0,
      });
    case 'barge-in':
      if (state.phase !== 'thinking' && state.phase !== 'speaking') return reject(state);
      return ok({
        ...state,
        phase: 'listening',
        partialTranscript: '',
        error: null,
        announcingError: false,
        audioLevel: 0,
      });
    case 'spoken-done':
      if (state.phase !== 'speaking') return reject(state);
      if (state.announcingError || state.mode === 'push-to-talk') {
        return ok({
          ...state,
          phase: 'idle',
          announcingError: false,
          assistantText: state.announcingError ? '' : state.assistantText,
          partialTranscript: '',
          audioLevel: 0,
        });
      }
      return ok({
        ...state,
        phase: 'listening',
        announcingError: false,
        partialTranscript: '',
        finalTranscript: '',
        error: null,
        audioLevel: 0,
      });
    default:
      return reject(state);
  }
}
