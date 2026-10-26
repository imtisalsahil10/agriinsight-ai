export interface FieldPrefs {
  lowBandwidth: boolean;
  highContrast: boolean;
  largeText: boolean;
  speechRate: number;
  wakeWord: boolean;
}

const KEY = 'agriinsight_field';

export const DEFAULT_PREFS: FieldPrefs = {
  lowBandwidth: false,
  highContrast: false,
  largeText: false,
  speechRate: 1,
  wakeWord: false,
};

const memory = new Map<string, string>();

function readRaw(): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(KEY);
  return memory.get(KEY) ?? null;
}

function writeRaw(value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, value);
  else memory.set(KEY, value);
}

export function loadFieldPrefs(): FieldPrefs {
  const raw = readRaw();
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<FieldPrefs>;
    const rate = typeof parsed.speechRate === 'number' ? parsed.speechRate : 1;
    return {
      lowBandwidth: Boolean(parsed.lowBandwidth),
      highContrast: Boolean(parsed.highContrast),
      largeText: Boolean(parsed.largeText),
      speechRate: Math.min(1.4, Math.max(0.8, rate)),
      wakeWord: Boolean(parsed.wakeWord),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveFieldPrefs(prefs: FieldPrefs): FieldPrefs {
  const next = { ...prefs, speechRate: Math.min(1.4, Math.max(0.8, prefs.speechRate)) };
  writeRaw(JSON.stringify(next));
  return next;
}
