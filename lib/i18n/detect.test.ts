import { describe, expect, it } from 'vitest';
import { detectLanguageSwitch, detectUtteranceLanguage } from './detect';

describe('language detection', () => {
  it('switches when the farmer asks', () => {
    expect(detectLanguageSwitch('Hindi mein bolo')).toBe('hi-IN');
    expect(detectLanguageSwitch('English mein bolo')).toBe('en-US');
    expect(detectLanguageSwitch('how is my wheat')).toBeNull();
  });

  it('treats Devanagari and common Hinglish as Hindi', () => {
    expect(detectUtteranceLanguage('गेहूँ को पानी कब दूँ')).toBe('hi-IN');
    expect(detectUtteranceLanguage('mera gehu kaisa hai')).toBe('hi-IN');
    expect(detectUtteranceLanguage('How often should I water wheat?')).toBe('en-US');
  });
});
