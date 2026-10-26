const WAKE = /^\s*hey kisan[\s,!.]*/i;

export function stripWakeWord(text: string, enabled: boolean): string {
  if (!enabled) return text;
  return text.replace(WAKE, '').trim();
}
