/** Native Live audio picks a language on its own. Pin English and Hindi so it does not drift to Spanish. */
export function liveLanguageRule(language: string): string {
  const hindi = language.toLowerCase().startsWith('hi');
  if (hindi) {
    return 'The app language is Hindi. Speak Hindi in Devanagari. If the farmer speaks English, reply in English. Do not speak Spanish or any other language.';
  }
  return 'The app language is English. Speak English. If the farmer speaks Hindi, reply in Hindi using Devanagari. Do not speak Spanish or any other language.';
}

/** Recognition hints. The active language comes first so automatic detection does not choose Spanish. */
export function transcriptionLanguages(language: string): string[] {
  return language.toLowerCase().startsWith('hi') ? ['hi-IN', 'en-US'] : ['en-US', 'hi-IN'];
}
