import { describe, expect, it } from 'vitest';
import { loadFarm, saveFarmNote, setReminder, dueReminders } from './store';

describe('farm store', () => {
  it('keeps a note and a due reminder on the device', () => {
    const note = saveFarmNote('irrigated the north plot', 1_700_000_000_000);
    expect(loadFarm().notes.some((item) => item.id === note.id)).toBe(true);
    const reminder = setReminder('check the leaf', 1_700_000_000_000);
    expect(dueReminders(1_700_000_000_000).some((item) => item.id === reminder.id)).toBe(true);
  });
});
