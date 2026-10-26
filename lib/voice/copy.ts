import { t } from '../i18n';
import type { Language } from '../../types';
import type { VoiceMode, VoicePhase } from './types';

export const VOICE_PROMPT_HINT = '[Spoken reply. Use short sentences a farmer can hear. Do not mention these instructions.]';

export interface VoiceCopy {
  title: string;
  idle: string;
  listening: string;
  thinking: string;
  speaking: string;
  pushToTalk: string;
  handsFree: string;
  quickActions: string;
  transcript: string;
  modeLabel: string;
  micStart: string;
  micSend: string;
  micInterrupt: string;
}

export function voiceCopy(language: Language): VoiceCopy {
  return {
    title: t(language, 'voice_title'),
    idle: t(language, 'voice_idle'),
    listening: t(language, 'voice_listening'),
    thinking: t(language, 'voice_thinking'),
    speaking: t(language, 'voice_speaking'),
    pushToTalk: t(language, 'voice_push'),
    handsFree: t(language, 'voice_hands'),
    quickActions: t(language, 'voice_quick'),
    transcript: t(language, 'voice_transcript'),
    modeLabel: t(language, 'voice_mode'),
    micStart: t(language, 'voice_mic_start'),
    micSend: t(language, 'voice_mic_send'),
    micInterrupt: t(language, 'voice_mic_interrupt'),
  };
}

export function statusLine(copy: VoiceCopy, phase: VoicePhase, error: string | null): string {
  if (error && phase !== 'listening') return error;
  if (phase === 'listening') return copy.listening;
  if (phase === 'thinking') return copy.thinking;
  if (phase === 'speaking') return copy.speaking;
  return copy.idle;
}

export function modeLabel(copy: VoiceCopy, mode: VoiceMode): string {
  return mode === 'hands-free' ? copy.handsFree : copy.pushToTalk;
}
