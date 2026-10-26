import { describe, expect, it } from 'vitest';
import { parseSseBuffer } from './sse';

describe('parseSseBuffer', () => {
  it('parses complete delta and done events', () => {
    const raw = [
      'data: {"type":"delta","text":"Hello"}',
      '',
      'data: {"type":"done","text":"Hello","sources":[{"title":"IMD","uri":"https://example.com"}]}',
      '',
      '',
    ].join('\n');
    const { events, rest } = parseSseBuffer(raw);
    expect(events).toEqual([
      { type: 'delta', text: 'Hello' },
      { type: 'done', text: 'Hello', sources: [{ title: 'IMD', uri: 'https://example.com' }] },
    ]);
    expect(rest).toBe('');
  });

  it('keeps an incomplete frame in the tail', () => {
    const { events, rest } = parseSseBuffer('data: {"type":"delta","text":"Hi"}\n\ndata: {"type":"del');
    expect(events).toEqual([{ type: 'delta', text: 'Hi' }]);
    expect(rest).toBe('data: {"type":"del');
  });
});
