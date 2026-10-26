import type { Language } from '../../types';
import { en, type MessageKey } from './en';
import { hi } from './hi';

const catalogs: Record<Language, Record<MessageKey, string>> = {
  'en-US': en,
  'hi-IN': hi,
};

export function t(language: Language, key: MessageKey): string {
  return catalogs[language][key] ?? en[key];
}

export { LANGUAGES, voiceFor } from './languages';
export type { LanguageOption, LocaleId } from './languages';
export type { MessageKey } from './en';
