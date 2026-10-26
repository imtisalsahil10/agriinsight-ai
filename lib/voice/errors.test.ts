import { describe, expect, it } from 'vitest';
import { voiceErrorMessage } from './errors';

describe('voiceErrorMessage', () => {
  it('speaks the no-speech error in the active language', () => {
    expect(voiceErrorMessage('no-speech', 'en-US')).toBe("I couldn't hear you. Please try again.");
    expect(voiceErrorMessage('no-speech', 'hi-IN')).toBe('मैं सुन नहीं पाया। कृपया फिर से बोलें।');
  });
});
