import { describe, expect, it } from 'vitest';
import { extractPatch, interpret, isAssistantCommand } from './intent';
import { ASSISTANT_VIEWS } from './types';
import type { ViewState } from '../../types';

const EVERY_VIEW: ViewState[] = [
  'voice', 'dashboard', 'chat', 'video', 'disease', 'soil', 'irrigation', 'market',
  'alerts', 'calendar', 'fertilizer', 'locations', 'yield', 'settings',
];

describe('assistant commands', () => {
  it('covers every route', () => {
    expect([...ASSISTANT_VIEWS].sort()).toEqual([...EVERY_VIEW].sort());
  });

  it('navigates with English and Hindi names', () => {
    expect(interpret('Go to Disease Detection.')).toEqual({ kind: 'navigate', view: 'disease' });
    expect(interpret('Open Soil Analysis')).toEqual({ kind: 'navigate', view: 'soil' });
    expect(interpret('Take me to Crop Recommendation')).toEqual({ kind: 'navigate', view: 'soil' });
    expect(interpret('Go back to the dashboard')).toEqual({ kind: 'navigate', view: 'dashboard' });
    expect(interpret('बाजार खोलो')).toEqual({ kind: 'navigate', view: 'market' });
    expect(interpret('सिंचाई खोलो')).toEqual({ kind: 'navigate', view: 'irrigation' });
  });

  it('fills soil numbers without running', () => {
    const intent = interpret('My nitrogen is 40, phosphorus is 30, and potassium is 50.');
    expect(intent).toMatchObject({
      kind: 'act',
      execute: false,
      patch: { nitrogen: 40, phosphorus: 30, potassium: 50 },
    });
  });

  it('asks to run soil, market, irrigation, and fertilizer from the words used', () => {
    expect(interpret('Recommend a crop for my soil.')).toMatchObject({ kind: 'act', view: 'soil', execute: true });
    expect(interpret('Show me the market price for wheat')).toMatchObject({
      kind: 'act',
      view: 'market',
      execute: true,
      patch: { crop: 'wheat' },
    });
    expect(interpret('Calculate irrigation requirements for my field')).toMatchObject({
      kind: 'act',
      view: 'irrigation',
      execute: true,
    });
    expect(interpret('Recommend fertilizer for nitrogen deficiency')).toMatchObject({
      kind: 'act',
      view: 'fertilizer',
      execute: true,
      patch: { concern: 'nitrogen deficiency' },
    });
    expect(interpret('Analyze this leaf image.')).toMatchObject({ kind: 'act', view: 'disease', execute: true });
  });

  it('reads results, explains the page, stops, and switches language', () => {
    expect(interpret('Read my latest results')).toEqual({ kind: 'read' });
    expect(interpret('Explain how this feature works')).toEqual({ kind: 'explain' });
    expect(interpret('Stop speaking')).toEqual({ kind: 'stop' });
    expect(interpret('Switch to Hindi')).toEqual({ kind: 'language', language: 'hi-IN' });
    expect(interpret('What should I plant near the river?').kind).toBe('chat');
    expect(isAssistantCommand('Open yield prediction')).toBe(true);
    expect(isAssistantCommand('hello there')).toBe(false);
  });

  it('reads number words and crop names', () => {
    expect(extractPatch('nitrogen is forty and the crop is rice')).toMatchObject({
      nitrogen: 40,
      crop: 'rice',
    });
    expect(extractPatch('गेहूं का बाजार भाव')).toMatchObject({ crop: 'wheat' });
  });
});
