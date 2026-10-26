import { describe, expect, it } from 'vitest';
import { SPEECH_CHAR_BUDGET, createSpeechPlanner, stripMarkdown } from './speechText';

describe('speech text', () => {
  it('strips markdown before speaking', () => {
    expect(stripMarkdown('**Rain** tonight. See [IMD](https://example.com).')).toBe('Rain tonight. See IMD.');
  });

  it('speaks a short answer without asking for more', () => {
    const planner = createSpeechPlanner('en-US');
    expect(planner.push('Rain tonight.', false)).toEqual(['Rain tonight.']);
    expect(planner.push('Rain tonight.', true)).toEqual([]);
  });

  it('caps a long answer near 20 seconds and asks for more', () => {
    const sentence = 'Water the field in the morning and check the leaves again. ';
    const long = sentence.repeat(20);
    const planner = createSpeechPlanner('en-US');
    const spoken = planner.push(long, true);
    expect(spoken[spoken.length - 1]).toBe('Want more detail?');
    const body = spoken.slice(0, -1).join(' ');
    expect(body.length).toBeLessThanOrEqual(SPEECH_CHAR_BUDGET);
    expect(body.length).toBeGreaterThan(200);
  });

  it('asks the follow-up in Hindi', () => {
    const long = 'पानी सुबह दें। '.repeat(80);
    const planner = createSpeechPlanner('hi-IN');
    const spoken = planner.push(long, true);
    expect(spoken[spoken.length - 1]).toBe('और विस्तार से बताऊँ?');
  });
});
