import { dayKey } from './streak';

export interface ReminderSettings {
  enabled: boolean;
  /** Local time of day, HH:mm. */
  time: string;
  /** Weekdays to remind on, 0 = Sunday ... 6 = Saturday. */
  days: number[];
}

export const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  time: '18:00',
  days: [0, 1, 2, 3, 4, 5, 6],
};

/** A reminder opened more than this long after its time is considered stale and skipped. */
export const MAX_LATE_MINUTES = 4 * 60;

export function parseTime(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Defensive parsing of whatever came out of storage. */
export function normalizeSettings(raw: unknown): ReminderSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<ReminderSettings>;
  const days = Array.isArray(r.days)
    ? Array.from(new Set(r.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))).sort()
    : DEFAULT_REMINDER.days;
  return {
    enabled: r.enabled === true,
    time: typeof r.time === 'string' && parseTime(r.time) !== null ? r.time : DEFAULT_REMINDER.time,
    days,
  };
}

export interface DueInput {
  now: Date;
  settings: ReminderSettings;
  /** Day (yyyy-MM-dd) on which a reminder was last shown, if any. */
  lastShownDay: string | null;
  /** True if a workout is already logged today. */
  workedOutToday: boolean;
}

/** Should a reminder fire right now? */
export function isReminderDue({ now, settings, lastShownDay, workedOutToday }: DueInput): boolean {
  if (!settings.enabled || workedOutToday) return false;
  if (!settings.days.includes(now.getDay())) return false;
  if (lastShownDay === dayKey(now)) return false;

  const target = parseTime(settings.time);
  if (target === null) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= target && current - target <= MAX_LATE_MINUTES;
}

/** Cheap pre-check that needs no network: is it even time to look at workouts? */
export function isReminderTime(now: Date, settings: ReminderSettings, lastShownDay: string | null): boolean {
  return isReminderDue({ now, settings, lastShownDay, workedOutToday: false });
}

export interface MessageInput {
  streak: number;
  atRisk: boolean;
  weekDone: number;
  weekGoal: number;
}

export function reminderMessage({ streak, atRisk, weekDone, weekGoal }: MessageInput): { title: string; body: string } {
  const remaining = Math.max(0, weekGoal - weekDone);
  if (atRisk && streak >= 2) {
    return { title: `Giữ chuỗi ${streak} ngày!`, body: 'Hôm nay bạn chưa tập. Một buổi ngắn cũng đủ để giữ chuỗi.' };
  }
  if (remaining > 0) {
    return {
      title: 'Đến giờ tập rồi!',
      body: `Tuần này bạn còn ${remaining} buổi nữa để đạt mục tiêu ${weekGoal} buổi.`,
    };
  }
  return { title: 'Đến giờ tập rồi!', body: 'Bạn đã đạt mục tiêu tuần, thêm một buổi nữa để vượt chỉ tiêu nhé.' };
}

// --- storage ----------------------------------------------------------------------------------

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const settingsKey = (uid: string) => `flexpath:reminder:${uid}`;
export const lastShownKey = (uid: string) => `flexpath:reminder-last:${uid}`;
export const SETTINGS_EVENT = 'flexpath-reminder-changed';

export function loadSettings(store: KeyValueStore, uid: string): ReminderSettings {
  try {
    const raw = store.getItem(settingsKey(uid));
    return normalizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_REMINDER };
  }
}

export function saveSettings(store: KeyValueStore, uid: string, settings: ReminderSettings) {
  store.setItem(settingsKey(uid), JSON.stringify(normalizeSettings(settings)));
}
