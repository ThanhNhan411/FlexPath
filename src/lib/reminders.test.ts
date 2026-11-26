import { describe, it, expect } from 'vitest';
import {
  DEFAULT_REMINDER,
  isReminderDue,
  isReminderTime,
  loadSettings,
  normalizeSettings,
  parseTime,
  reminderMessage,
  saveSettings,
  settingsKey,
  KeyValueStore,
  ReminderSettings,
} from './reminders';

const on: ReminderSettings = { enabled: true, time: '18:00', days: [0, 1, 2, 3, 4, 5, 6] };
// Wednesday 2026-06-17
const at = (h: number, m = 0) => new Date(2026, 5, 17, h, m);

const memoryStore = (): KeyValueStore & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => void (data[k] = v) };
};

describe('parseTime', () => {
  it.each([
    ['18:00', 1080],
    ['0:05', 5],
    ['23:59', 1439],
  ])('%s -> %s', (t, mins) => expect(parseTime(t)).toBe(mins));

  it.each(['24:00', '12:60', '', 'abc', '1800'])('rejects %j', t => expect(parseTime(t)).toBeNull());
});

describe('isReminderDue', () => {
  const base = { settings: on, lastShownDay: null, workedOutToday: false };

  it('is not due before the time', () => {
    expect(isReminderDue({ ...base, now: at(17, 59) })).toBe(false);
  });

  it('is due at and shortly after the time', () => {
    expect(isReminderDue({ ...base, now: at(18, 0) })).toBe(true);
    expect(isReminderDue({ ...base, now: at(20, 30) })).toBe(true);
  });

  it('skips stale reminders opened hours later', () => {
    expect(isReminderDue({ ...base, now: at(22, 1) })).toBe(false);
  });

  it('is off when disabled', () => {
    expect(isReminderDue({ ...base, settings: { ...on, enabled: false }, now: at(18, 5) })).toBe(false);
  });

  it('respects the chosen weekdays', () => {
    const weekendOnly = { ...on, days: [0, 6] };
    expect(isReminderDue({ ...base, settings: weekendOnly, now: at(18, 5) })).toBe(false); // Wednesday
    expect(isReminderDue({ ...base, settings: weekendOnly, now: new Date(2026, 5, 20, 18, 5) })).toBe(true); // Saturday
  });

  it('fires at most once per day', () => {
    expect(isReminderDue({ ...base, lastShownDay: '2026-06-17', now: at(18, 5) })).toBe(false);
    expect(isReminderDue({ ...base, lastShownDay: '2026-06-16', now: at(18, 5) })).toBe(true);
  });

  it('stays quiet once a workout was logged today', () => {
    expect(isReminderDue({ ...base, workedOutToday: true, now: at(18, 5) })).toBe(false);
  });

  it('isReminderTime is the network-free pre-check', () => {
    expect(isReminderTime(at(18, 5), on, null)).toBe(true);
    expect(isReminderTime(at(9, 0), on, null)).toBe(false);
  });
});

describe('normalizeSettings', () => {
  it('falls back to defaults for junk', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_REMINDER);
    expect(normalizeSettings('x')).toEqual(DEFAULT_REMINDER);
  });

  it('cleans days and rejects bad times', () => {
    const s = normalizeSettings({ enabled: true, time: '99:99', days: [3, 1, 1, 9, -1, 2.5, 'x'] });
    expect(s).toEqual({ enabled: true, time: DEFAULT_REMINDER.time, days: [1, 3] });
  });

  it('only treats literal true as enabled', () => {
    expect(normalizeSettings({ enabled: 'yes' }).enabled).toBe(false);
  });
});

describe('storage', () => {
  it('round trips settings per user', () => {
    const store = memoryStore();
    saveSettings(store, 'u1', { enabled: true, time: '07:30', days: [1, 3, 5] });
    expect(loadSettings(store, 'u1')).toEqual({ enabled: true, time: '07:30', days: [1, 3, 5] });
    expect(loadSettings(store, 'u2')).toEqual(DEFAULT_REMINDER);
  });

  it('survives corrupted JSON', () => {
    const store = memoryStore();
    store.setItem(settingsKey('u1'), '{not json');
    expect(loadSettings(store, 'u1')).toEqual(DEFAULT_REMINDER);
  });
});

describe('reminderMessage', () => {
  it('urges keeping a streak that is at risk', () => {
    const m = reminderMessage({ streak: 5, atRisk: true, weekDone: 1, weekGoal: 3 });
    expect(m.title).toContain('5 ngày');
  });

  it('mentions remaining sessions toward the weekly goal', () => {
    const m = reminderMessage({ streak: 0, atRisk: false, weekDone: 1, weekGoal: 3 });
    expect(m.body).toContain('2 buổi');
  });

  it('congratulates when the goal is already reached', () => {
    const m = reminderMessage({ streak: 0, atRisk: false, weekDone: 3, weekGoal: 3 });
    expect(m.body).toContain('đạt mục tiêu tuần');
  });

  it('ignores a one-day streak at risk (not worth a streak message)', () => {
    expect(reminderMessage({ streak: 1, atRisk: true, weekDone: 0, weekGoal: 3 }).title).toBe('Đến giờ tập rồi!');
  });
});
