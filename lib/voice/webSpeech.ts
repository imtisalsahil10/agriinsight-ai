export interface SpeechAlternativeLike {
  transcript: string;
  confidence: number;
}

export interface SpeechResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternativeLike;
}

export interface SpeechResultListLike {
  readonly length: number;
  [index: number]: SpeechResultLike;
}

export interface SpeechResultEventLike extends Event {
  results: SpeechResultListLike;
}

export interface SpeechErrorEventLike extends Event {
  error: string;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  onend: ((event: Event) => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechWindow {
  SpeechRecognition?: RecognitionCtor;
  webkitSpeechRecognition?: RecognitionCtor;
}

export function getSpeechRecognition(): RecognitionCtor | null {
  const speechWindow = window as Window & SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function isSecureVoiceContext(): boolean {
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

export function transcriptFromResults(results: SpeechResultListLike): { text: string; isFinal: boolean } {
  let text = '';
  for (let i = 0; i < results.length; i += 1) {
    text += results[i]?.[0]?.transcript ?? '';
  }
  const last = results[results.length - 1];
  return { text: text.trim(), isFinal: Boolean(last?.isFinal) };
}
