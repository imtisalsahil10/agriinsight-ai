/** Join Gemini Live transcription pieces without repeating a chunk that already arrived. */
export function mergeTranscript(current: string, piece: string): string {
  if (!piece) return current;
  const next = piece.trim();
  if (!next) return current;
  if (!current) return next;
  if (piece.startsWith(current) || next.startsWith(current)) return next;
  if (current.length >= 12 && next.includes(current)) return next;
  if (current.endsWith(piece) || current.endsWith(next)) return current;
  return current + piece;
}

/** True when a new reply is the same answer already shown, even if a few words were rephrased at the end. */
export function isRepeat(previous: string, next: string): boolean {
  const left = previous.replace(/\s+/g, ' ').trim();
  const right = next.replace(/\s+/g, ' ').trim();
  if (!left || !right) return false;
  if (left === right) return true;
  const length = Math.min(left.length, right.length, 80);
  return length >= 40 && left.slice(0, length) === right.slice(0, length);
}
