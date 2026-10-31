/**
 * macOS ships novelty voices (Albert, Zarvox, …) with lang en-US.
 * `voices.find(voice => voice.lang === 'en-US')` returns one of those
 * whenever it is listed first, so the assistant sounds like a sound effect.
 * Leave the utterance voice unset when nothing natural is available and the
 * browser keeps its default voice for that language.
 */

export interface SpokenVoice {
  name: string;
  lang: string;
}

const NOVELTY = new Set([
  'albert',
  'bad news',
  'bahh',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'deranged',
  'good news',
  'hysterical',
  'jester',
  'organ',
  'superstar',
  'trinoids',
  'whisper',
  'wobble',
  'zarvox',
]);

const PREFERRED = [
  'google us english',
  'google uk english female',
  'google uk english male',
  'samantha',
  'alex',
  'karen',
  'moira',
  'daniel',
  'google हिन्दी',
  'lekha',
  'veena',
];

export function pickSpokenVoice(voices: readonly SpokenVoice[], language: string): SpokenVoice | undefined {
  const lang = language.toLowerCase();
  const prefix = lang.slice(0, 2);
  const matching = voices.filter((voice) => {
    const voiceLang = voice.lang.toLowerCase();
    return voiceLang === lang || voiceLang.startsWith(`${prefix}-`) || voiceLang === prefix;
  });
  const natural = matching.filter((voice) => !NOVELTY.has(voice.name.toLowerCase()));
  const pool = natural.length > 0 ? natural : [];
  for (const name of PREFERRED) {
    const found = pool.find((voice) => voice.name.toLowerCase() === name);
    if (found) return found;
  }
  const google = pool.find((voice) => voice.name.toLowerCase().includes('google'));
  if (google) return google;
  return pool.find((voice) => voice.lang.toLowerCase() === lang) ?? pool[0];
}
