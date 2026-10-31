import { describe, expect, it } from 'vitest';
import { pickSpokenVoice } from './spokenVoice';

describe('pickSpokenVoice', () => {
  it('skips the macOS novelty voice that is listed first', () => {
    const chosen = pickSpokenVoice([
      { name: 'Albert', lang: 'en-US' },
      { name: 'Zarvox', lang: 'en-US' },
      { name: 'Samantha', lang: 'en-US' },
    ], 'en-US');
    expect(chosen?.name).toBe('Samantha');
  });

  it('prefers the Google English voice over another natural voice', () => {
    const chosen = pickSpokenVoice([
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Google US English', lang: 'en-US' },
    ], 'en-US');
    expect(chosen?.name).toBe('Google US English');
  });

  it('picks a Hindi voice for Hindi', () => {
    const chosen = pickSpokenVoice([
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Lekha', lang: 'hi-IN' },
    ], 'hi-IN');
    expect(chosen?.name).toBe('Lekha');
  });

  it('returns nothing when every match is a novelty voice', () => {
    expect(pickSpokenVoice([
      { name: 'Albert', lang: 'en-US' },
      { name: 'Boing', lang: 'en-US' },
    ], 'en-US')).toBeUndefined();
  });
});
