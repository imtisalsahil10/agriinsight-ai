import { saveFarmNote, setReminder, updateFarm, type FarmProfile } from '../farm/store';
import { toolResult, type ToolResult } from './types';

export function saveNote(text: string, now = Date.now()): ToolResult<{ id: string }> {
  const trimmed = text.trim();
  if (!trimmed) {
    return toolResult({
      ok: false,
      name: 'save_farm_note',
      source: 'device',
      demo: false,
      confidence: 1,
      summary: 'There was no note to save.',
      inputs: { text },
      data: { id: '' },
    });
  }
  const note = saveFarmNote(trimmed, now);
  return toolResult({
    ok: true,
    name: 'save_farm_note',
    source: 'device',
    demo: false,
    confidence: 1,
    summary: 'Saved on this device.',
    inputs: { text: trimmed },
    data: { id: note.id },
  });
}

export function remind(text: string, when: string, now = Date.now()): ToolResult<{ id: string; at: number }> {
  const trimmed = text.trim();
  const parsed = Date.parse(when);
  const at = Number.isFinite(parsed) ? parsed : now + 24 * 60 * 60 * 1000;
  if (!trimmed) {
    return toolResult({
      ok: false,
      name: 'set_reminder',
      source: 'device',
      demo: false,
      confidence: 1,
      summary: 'There was no reminder to set.',
      inputs: { text, when },
      data: { id: '', at },
    });
  }
  const reminder = setReminder(trimmed, at);
  return toolResult({
    ok: true,
    name: 'set_reminder',
    source: 'device',
    demo: false,
    confidence: 1,
    summary: `Reminder saved on this device for ${new Date(at).toLocaleString('en-GB', { timeZone: 'UTC' })}. It notifies only while this page is open.`,
    inputs: { text: trimmed, when },
    data: { id: reminder.id, at },
  });
}

export function setFarmProfile(patch: Partial<Pick<FarmProfile, 'location' | 'crops' | 'areaHectares' | 'soil' | 'latitude' | 'longitude'>>): ToolResult<FarmProfile> {
  const crops = Array.isArray(patch.crops)
    ? patch.crops.map((crop) => crop.trim()).filter(Boolean)
    : undefined;
  const profile = updateFarm({
    ...(patch.location !== undefined ? { location: patch.location.trim() } : {}),
    ...(crops ? { crops } : {}),
    ...(patch.areaHectares !== undefined ? { areaHectares: patch.areaHectares } : {}),
    ...(patch.soil !== undefined ? { soil: patch.soil } : {}),
    ...(patch.latitude !== undefined ? { latitude: patch.latitude } : {}),
    ...(patch.longitude !== undefined ? { longitude: patch.longitude } : {}),
  });
  return toolResult({
    ok: true,
    name: 'set_farm_profile',
    source: 'device',
    demo: false,
    confidence: 1,
    summary: `Farm profile saved on this device${profile.location ? ` for ${profile.location}` : ''}.`,
    inputs: { ...patch },
    data: profile,
  });
}
