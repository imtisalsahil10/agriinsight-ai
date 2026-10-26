export type LocaleId = 'en' | 'hi' | 'te' | 'ta' | 'mr' | 'pa';

export interface LanguageOption {
  id: LocaleId;
  bcp47: string;
  label: string;
  enabled: boolean;
  geminiVoice: string;
  stt: string;
}

export const LANGUAGES: LanguageOption[] = [
  { id: 'en', bcp47: 'en-US', label: 'English', enabled: true, geminiVoice: 'Puck', stt: 'en-US' },
  { id: 'hi', bcp47: 'hi-IN', label: 'हिन्दी', enabled: true, geminiVoice: 'Kore', stt: 'hi-IN' },
  { id: 'te', bcp47: 'te-IN', label: 'తెలుగు', enabled: false, geminiVoice: 'Puck', stt: 'te-IN' },
  { id: 'ta', bcp47: 'ta-IN', label: 'தமிழ்', enabled: false, geminiVoice: 'Puck', stt: 'ta-IN' },
  { id: 'mr', bcp47: 'mr-IN', label: 'मराठी', enabled: false, geminiVoice: 'Puck', stt: 'mr-IN' },
  { id: 'pa', bcp47: 'pa-IN', label: 'ਪੰਜਾਬੀ', enabled: false, geminiVoice: 'Puck', stt: 'pa-IN' },
];

export function voiceFor(bcp47: string): string {
  return LANGUAGES.find((language) => language.bcp47 === bcp47)?.geminiVoice ?? 'Puck';
}
