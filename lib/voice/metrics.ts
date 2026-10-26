/**
 * Client-side voice metrics. Logged as JSON to the console only.
 * There is no /api/log route; that would be extra infrastructure.
 * toolDurationMs stays null until a tool actually runs.
 */

export interface VoiceTurnMetric {
  metric: 'voice_turn';
  timeToFirstAudioMs: number | null;
  toolDurationMs: number | null;
}

export function logVoiceMetric(metric: Omit<VoiceTurnMetric, 'metric'>): void {
  const payload: VoiceTurnMetric = { metric: 'voice_turn', ...metric };
  console.info(JSON.stringify(payload));
}

export function logToolDuration(name: string, durationMs: number): void {
  console.info(JSON.stringify({ metric: 'tool', name, toolDurationMs: durationMs }));
}
