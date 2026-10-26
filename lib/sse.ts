import type { Source } from '../types';

export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; text: string; sources: Source[] }
  | { type: 'error'; message: string };

function asSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return [];
  const sources: Source[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.uri !== 'string' || !record.uri) continue;
    sources.push({
      title: typeof record.title === 'string' && record.title ? record.title : 'Source',
      uri: record.uri,
    });
  }
  return sources;
}

export function asChatStreamEvent(value: unknown): ChatStreamEvent {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid stream event');
  }
  const record = value as Record<string, unknown>;
  if (record.type === 'delta' && typeof record.text === 'string') {
    return { type: 'delta', text: record.text };
  }
  if (record.type === 'done' && typeof record.text === 'string') {
    return { type: 'done', text: record.text, sources: asSources(record.sources) };
  }
  if (record.type === 'error' && typeof record.message === 'string') {
    return { type: 'error', message: record.message };
  }
  throw new Error('Invalid stream event');
}

/** Split a text/event-stream buffer into complete events and the unparsed tail. */
export function parseSseBuffer(buffer: string): { events: ChatStreamEvent[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  const events: ChatStreamEvent[] = [];
  for (const part of parts) {
    const data = part
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) continue;
    events.push(asChatStreamEvent(JSON.parse(data) as unknown));
  }
  return { events, rest };
}
