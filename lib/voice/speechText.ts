import type { Language } from '../../types';

/** About 20 seconds of speech at a typical rate of 16 characters per second. */
export const SPEECH_CHAR_BUDGET = 320;

const MORE: Record<Language, string> = {
  'en-US': 'Want more detail?',
  'hi-IN': 'और विस्तार से बताऊँ?',
};

export function stripMarkdown(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clipAtWord(text: string, max: number): string {
  if (text.length <= max) return text.trim();
  const slice = text.slice(0, max);
  const space = slice.lastIndexOf(' ');
  if (space >= Math.floor(max * 0.6)) return slice.slice(0, space).trim();
  return slice.trim();
}

export interface SpeechSlice {
  utterances: string[];
  consumed: number;
  truncated: boolean;
}

/**
 * Take newly speakable text from `plain`, starting at `consumed`.
 * Incomplete sentences wait, unless the stream is done or a long clause is already in.
 */
export function takeSpeech(plain: string, consumed: number, done: boolean, budget = SPEECH_CHAR_BUDGET): SpeechSlice {
  if (consumed >= plain.length || consumed >= budget) {
    return { utterances: [], consumed, truncated: plain.length > budget };
  }

  const windowEnd = Math.min(plain.length, budget);
  const window = plain.slice(consumed, windowEnd);
  const sentenceRe = /[^.!?।]*[.!?।]/g;
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = sentenceRe.exec(window))) {
    lastEnd = match.index + match[0].length;
  }

  if (!done && lastEnd === 0) {
    const pending = window.trimStart();
    if (pending.length < 80) {
      return { utterances: [], consumed, truncated: false };
    }
    const clause = clipAtWord(pending, 80);
    const at = plain.indexOf(clause, consumed);
    if (at === -1) return { utterances: [], consumed, truncated: false };
    return { utterances: [clause], consumed: at + clause.length, truncated: false };
  }

  if (!done) {
    const utterance = plain.slice(consumed, consumed + lastEnd).trim();
    return {
      utterances: utterance ? [utterance] : [],
      consumed: consumed + lastEnd,
      truncated: false,
    };
  }

  const rest = plain.slice(consumed).trim();
  const room = budget - consumed;
  if (!rest) {
    return { utterances: [], consumed: plain.length, truncated: plain.length > budget };
  }
  if (rest.length <= room) {
    return { utterances: [rest], consumed: plain.length, truncated: false };
  }
  const clipped = clipAtWord(rest, room);
  return {
    utterances: clipped ? [clipped] : [],
    consumed: budget,
    truncated: true,
  };
}

export interface SpeechPlanner {
  readonly spoke: boolean;
  push(markdown: string, done: boolean): string[];
}

export function createSpeechPlanner(language: Language): SpeechPlanner {
  let consumed = 0;
  let asked = false;
  let spoke = false;
  let closed = false;

  return {
    get spoke() {
      return spoke;
    },
    push(markdown: string, done: boolean): string[] {
      if (closed) return [];
      const plain = stripMarkdown(markdown);
      const planned = takeSpeech(plain, consumed, done);
      consumed = planned.consumed;
      const lines = planned.utterances.filter((line) => line.trim().length > 0);
      if (lines.length > 0) spoke = true;
      if (done && planned.truncated && !asked) {
        asked = true;
        lines.push(MORE[language]);
      }
      if (done) closed = true;
      return lines;
    },
  };
}
