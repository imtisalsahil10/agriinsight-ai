export interface FarmNote {
  id: string;
  text: string;
  at: number;
}

export interface FarmReminder {
  id: string;
  text: string;
  at: number;
  notified: boolean;
}

export interface FarmProfile {
  location: string;
  latitude?: number;
  longitude?: number;
  crops: string[];
  areaHectares?: number;
  soil?: string;
  language?: string;
  notes: FarmNote[];
  reminders: FarmReminder[];
  lastSummary: string;
  pendingSync: boolean;
}

const KEY = 'agriinsight_farm';

const EMPTY: FarmProfile = {
  location: '',
  crops: [],
  notes: [],
  reminders: [],
  lastSummary: '',
  pendingSync: false,
};

interface Bucket {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const memory = new Map<string, string>();

function bucket(): Bucket {
  if (typeof localStorage !== 'undefined') return localStorage;
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    },
  };
}

function id(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}`;
}

export function loadFarm(): FarmProfile {
  const raw = bucket().getItem(KEY);
  if (!raw) return { ...EMPTY, notes: [], reminders: [], crops: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<FarmProfile>;
    return {
      ...EMPTY,
      ...parsed,
      crops: Array.isArray(parsed.crops) ? parsed.crops : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
    };
  } catch {
    return { ...EMPTY, notes: [], reminders: [], crops: [] };
  }
}

export function saveFarm(profile: FarmProfile): FarmProfile {
  bucket().setItem(KEY, JSON.stringify(profile));
  return profile;
}

export function updateFarm(patch: Partial<FarmProfile>): FarmProfile {
  return saveFarm({ ...loadFarm(), ...patch, pendingSync: true });
}

export function saveFarmNote(text: string, now = Date.now()): FarmNote {
  const note = { id: id(), text: text.trim(), at: now };
  const profile = loadFarm();
  saveFarm({ ...profile, notes: [...profile.notes, note].slice(-50), pendingSync: true });
  return note;
}

export function setReminder(text: string, at: number): FarmReminder {
  const reminder = { id: id(), text: text.trim(), at, notified: false };
  const profile = loadFarm();
  saveFarm({ ...profile, reminders: [...profile.reminders, reminder].slice(-50), pendingSync: true });
  return reminder;
}

export function dueReminders(now = Date.now()): FarmReminder[] {
  return loadFarm().reminders.filter((reminder) => !reminder.notified && reminder.at <= now);
}

export function markReminderNotified(reminderId: string): void {
  const profile = loadFarm();
  saveFarm({
    ...profile,
    reminders: profile.reminders.map((reminder) => (
      reminder.id === reminderId ? { ...reminder, notified: true } : reminder
    )),
  });
}

export function rememberSummary(text: string): void {
  const trimmed = text.trim().slice(0, 280);
  if (!trimmed) return;
  saveFarm({ ...loadFarm(), lastSummary: trimmed });
}

export async function syncFarm(): Promise<{ synced: boolean }> {
  const profile = loadFarm();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    saveFarm({ ...profile, pendingSync: true });
    return { synced: false };
  }
  try {
    const response = await fetch('/api/farm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    const body = await response.json().catch(() => ({})) as { synced?: boolean };
    const synced = response.ok && body.synced === true;
    saveFarm({ ...loadFarm(), pendingSync: !synced });
    return { synced };
  } catch {
    saveFarm({ ...loadFarm(), pendingSync: true });
    return { synced: false };
  }
}
