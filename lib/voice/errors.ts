import { t, type MessageKey } from '../i18n';
import type { Language } from '../../types';
import type { VoiceErrorCode } from './types';

const KEYS: Record<VoiceErrorCode, MessageKey> = {
  unsupported: 'error_unsupported',
  insecure: 'error_insecure',
  offline: 'error_offline',
  'no-speech': 'error_no_speech',
  network: 'error_network',
  'not-allowed': 'error_not_allowed',
  'audio-capture': 'error_audio_capture',
  language: 'error_language',
  'start-failed': 'error_start_failed',
  'reply-failed': 'error_reply_failed',
  timeout: 'error_timeout',
};

export function voiceErrorMessage(code: VoiceErrorCode, language: Language): string {
  return t(language, KEYS[code]);
}

export class VoiceFailure extends Error {
  readonly code: VoiceErrorCode;

  constructor(code: VoiceErrorCode) {
    super(code);
    this.name = 'VoiceFailure';
    this.code = code;
  }
}

export function failureCode(error: unknown): VoiceErrorCode {
  if (error instanceof VoiceFailure) return error.code;
  if (error instanceof Error && error.name && error.name !== 'Error') return failureFromMic(error).code;
  return 'start-failed';
}

export function failureFromMic(error: unknown): VoiceFailure {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return new VoiceFailure('not-allowed');
  }
  if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError') {
    return new VoiceFailure('audio-capture');
  }
  return new VoiceFailure('start-failed');
}
