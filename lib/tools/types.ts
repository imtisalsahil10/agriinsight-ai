export type ToolSource = 'open-meteo' | 'mock' | 'model' | 'device';

export interface ToolResult<T = unknown> {
  ok: boolean;
  name: string;
  source: ToolSource;
  demo: boolean;
  confidence: number;
  summary: string;
  inputs: Record<string, unknown>;
  data: T;
}

export function toolResult<T>(result: ToolResult<T>): ToolResult<T> {
  return result;
}
