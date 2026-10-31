import type { ToolResult } from '../tools/types';
import type { Language, Source } from '../../types';

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking';
export type VoiceMode = 'push-to-talk' | 'hands-free';

export type VoiceErrorCode =
  | 'unsupported'
  | 'insecure'
  | 'offline'
  | 'no-speech'
  | 'network'
  | 'not-allowed'
  | 'audio-capture'
  | 'language'
  | 'start-failed'
  | 'reply-failed'
  | 'timeout';

/** Low-level audio and recognition events. Phase lives on the session, not the provider. */
export type ProviderEvent =
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string }
  | { type: 'silence' }
  | { type: 'level'; level: number }
  | { type: 'speech-start' }
  | { type: 'speech-end' }
  | { type: 'assistant'; text: string }
  | { type: 'tool'; result: ToolResult }
  | { type: 'error'; code: VoiceErrorCode };

export interface VoiceProvider {
  /**
   * When true, the provider speaks and calls tools itself.
   * The session must not also call reply() or speak().
   */
  handlesTurns?: boolean;
  start(): Promise<void>;
  stop(): void;
  /** Pause the mic without closing a Live socket. */
  suspend?(): void;
  /** Close the mic and any Live socket. */
  dispose?(): void;
  /** Hand extra text to a provider that owns the turn, such as a leaf diagnosis. */
  sendText?(text: string): void;
  bargeIn(): void;
  setMode(mode: VoiceMode): void;
  speak(text: string, language: Language): void;
  subscribe(listener: (event: ProviderEvent) => void): () => void;
}

export interface SessionState {
  phase: VoicePhase;
  mode: VoiceMode;
  partialTranscript: string;
  finalTranscript: string;
  assistantText: string;
  audioLevel: number;
  error: string | null;
  announcingError: boolean;
}

export interface ReplyRequest {
  prompt: string;
  history: Array<{ role: 'user' | 'model'; content: string }>;
  language: Language;
  signal: AbortSignal;
  onDelta: (fullText: string) => void;
}

export interface ReplyResult {
  text: string;
  sources: Source[];
}

export interface VoiceSession {
  getState(): SessionState;
  subscribe(listener: (state: SessionState) => void): () => void;
  start(): Promise<void>;
  /** Stop the mic and send whatever was heard. */
  release(): void;
  bargeIn(): void;
  /** Cancel the turn and return to idle. The session can start again. */
  stop(): void;
  /** Drop the session. In-flight work must not touch the UI. */
  dispose(): void;
  setMode(mode: VoiceMode): void;
  /** Speak extra text, or pass it into a Live session that owns the turn. */
  inject(text: string): void;
  /** Speak locally without sending the line to a Live model. */
  say(text: string): void;
}
