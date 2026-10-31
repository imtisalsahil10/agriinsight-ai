import { describe, expect, it } from 'vitest';
import { liveLanguageRule, transcriptionLanguages } from './liveLanguage';

describe('live language', () => {
  it('keeps English sessions in English', () => {
    expect(liveLanguageRule('en-US')).toContain('Speak English');
    expect(liveLanguageRule('en-US')).toContain('Do not speak Spanish');
    expect(transcriptionLanguages('en-US')).toEqual(['en-US', 'hi-IN']);
  });

  it('keeps Hindi sessions in Hindi', () => {
    expect(liveLanguageRule('hi-IN')).toContain('Devanagari');
    expect(transcriptionLanguages('hi-IN')[0]).toBe('hi-IN');
  });
});
