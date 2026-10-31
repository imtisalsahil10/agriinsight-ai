import { describe, expect, it } from 'vitest';
import { isRepeat, mergeTranscript } from './transcript';

describe('mergeTranscript', () => {
  it('keeps a cumulative transcript and drops a repeated tail', () => {
    const once = mergeTranscript('ज्वार एक प्रमुख', 'ज्वार एक प्रमुख अनाज है');
    expect(once).toBe('ज्वार एक प्रमुख अनाज है');
    expect(mergeTranscript(once, 'अनाज है')).toBe(once);
  });

  it('appends a new piece that does not overlap', () => {
    expect(mergeTranscript('गेहूं', ' को पानी दें')).toBe('गेहूं को पानी दें');
  });
});

describe('isRepeat', () => {
  it('treats a slightly longer copy of the same answer as a repeat', () => {
    const first = 'ज्वार एक प्रमुख अनाज है, जिसे कई इलाकों में सोरघम भी कहा जाता है। यह ग्लूटेन-फ्री होता है।';
    const second = `${first} इसका इस्तेमाल रोटी बनाने में किया जाता है।`;
    expect(isRepeat(first, second)).toBe(true);
  });

  it('keeps a different answer', () => {
    expect(isRepeat(
      'ज्वार एक प्रमुख अनाज है, जिसे कई इलाकों में सोरघम भी कहा जाता है।',
      'गेहूं को हर सात से दस दिन में पानी दें, जब मिट्टी ऊपर से सूख जाए।',
    )).toBe(false);
  });
});
