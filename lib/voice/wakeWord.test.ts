import { describe, expect, it } from 'vitest';
import { stripWakeWord } from './wakeWord';

describe('Hey Kisan', () => {
  it('is ignored unless the setting is on', () => {
    expect(stripWakeWord('Hey Kisan, check my wheat', false)).toBe('Hey Kisan, check my wheat');
    expect(stripWakeWord('Hey Kisan, check my wheat', true)).toBe('check my wheat');
  });
});
