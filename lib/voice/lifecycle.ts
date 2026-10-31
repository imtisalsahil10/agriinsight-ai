/** Release the microphone when the farmer leaves Talk. Other pages keep their own session. */
export function shouldReleaseVoice(previous: string, next: string): boolean {
  return previous === 'voice' && next !== 'voice';
}
