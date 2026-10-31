import type { Language, ViewState } from '../../types';

export interface FieldPatch {
  pH?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organicMatter?: number;
  crop?: string;
  region?: string;
  area?: number;
  rainfallDays?: number;
  temperature?: number;
  locationName?: string;
  url?: string;
  concern?: string;
}

export type Intent =
  | { kind: 'chat' }
  | { kind: 'stop' }
  | { kind: 'language'; language: Language }
  | { kind: 'explain' }
  | { kind: 'read' }
  | { kind: 'navigate'; view: ViewState }
  | { kind: 'act'; view: ViewState | null; patch: FieldPatch; execute: boolean };

export interface HandleResult {
  ok: boolean;
  ran: boolean;
  summary: string;
}

export interface AssistantPage {
  explain: () => string;
  read: () => string | null;
  handle: (patch: FieldPatch, execute: boolean) => Promise<HandleResult>;
}

/** Every routed screen. The assistant shell is mounted once, outside the view switch. */
export const ASSISTANT_VIEWS: ViewState[] = [
  'voice',
  'dashboard',
  'chat',
  'video',
  'disease',
  'soil',
  'irrigation',
  'market',
  'alerts',
  'calendar',
  'fertilizer',
  'locations',
  'yield',
  'settings',
];
