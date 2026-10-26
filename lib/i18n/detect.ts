import type { Language } from '../../types';

const SWITCH_HI = /hindi mein bolo|हिंदी में बोलो|हिन्दी में बोलो/i;
const SWITCH_EN = /english mein bolo|अंग्रेजी में बोलो/i;
const HINGLISH = /\b(kya|hai|mera|meri|gehu|gehun|paani|pani|fasal|khet|bolo)\b/i;

export function detectLanguageSwitch(text: string): Language | null {
  if (SWITCH_HI.test(text)) return 'hi-IN';
  if (SWITCH_EN.test(text)) return 'en-US';
  return null;
}

export function detectUtteranceLanguage(text: string): Language {
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
  if (HINGLISH.test(text)) return 'hi-IN';
  return 'en-US';
}
