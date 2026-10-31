/** How the Live socket reacts when the browser reports a drop. */

export const MAX_RECONNECTS = 3;

export function reconnectDelayMs(attempt: number): number {
  return 250 * Math.max(1, attempt);
}

export function socketClosePlan(input: {
  closing: boolean;
  quiet: boolean;
  recovering: boolean;
}): 'ignore' | 'reconnect' {
  if (input.closing || input.quiet || input.recovering) return 'ignore';
  return 'reconnect';
}
