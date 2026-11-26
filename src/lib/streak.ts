/**
 * Pure logic for workout streaks and the weekly goal. Days are local calendar days (yyyy-MM-dd),
 * weeks run Monday to Sunday.
 */

export interface WorkoutLike {
  startTime: string;
  status?: string;
}

export const DEFAULT_WEEKLY_GOAL = 3;
export const MIN_WEEKLY_GOAL = 1;
export const MAX_WEEKLY_GOAL = 7;

export function dayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (d: Date, n: number) => {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  c.setDate(c.getDate() + n);
  return c;
};

/** Only finished workouts count; a missing status is treated as finished (legacy data). */
const counts = (w: WorkoutLike) => !w.status || w.status === 'completed';

/** Set of local days that have at least one finished workout. */
export function workoutDays(workouts: WorkoutLike[]): Set<string> {
  const days = new Set<string>();
  for (const w of workouts) {
    if (!counts(w)) continue;
    const d = new Date(w.startTime);
    if (!Number.isNaN(d.getTime())) days.add(dayKey(d));
  }
  return days;
}

export interface StreakInfo {
  /** Consecutive days with a workout, ending today or yesterday. */
  current: number;
  longest: number;
  doneToday: boolean;
  /** Streak is alive but nothing has been logged today yet. */
  atRisk: boolean;
}

export function streakInfo(workouts: WorkoutLike[], now: Date = new Date()): StreakInfo {
  const days = workoutDays(workouts);
  const today = dayKey(now);
  const yesterday = dayKey(addDays(now, -1));
  const doneToday = days.has(today);

  let current = 0;
  if (doneToday || days.has(yesterday)) {
    let cursor = doneToday ? now : addDays(now, -1);
    while (days.has(dayKey(cursor))) {
      current++;
      cursor = addDays(cursor, -1);
    }
  }

  // Longest run anywhere in the history.
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of sorted) {
    run = prev && dayKey(addDays(parseKey(prev), 1)) === k ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }

  return { current, longest: Math.max(longest, current), doneToday, atRisk: current > 0 && !doneToday };
}

/** Monday 00:00 (local) of the week containing `d`. */
export function weekStart(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (c.getDay() + 6) % 7; // Mon=0 ... Sun=6
  c.setDate(c.getDate() - offset);
  return c;
}

export interface WeekDay {
  date: Date;
  key: string;
  done: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface WeekProgress {
  /** Finished workouts this week. */
  done: number;
  goal: number;
  remaining: number;
  /** Days left this week including today. */
  daysLeft: number;
  /** Goal can still be reached with at most one workout per remaining day. */
  reachable: boolean;
  reached: boolean;
  days: WeekDay[];
}

export function clampGoal(goal: unknown): number {
  const n = typeof goal === 'number' && Number.isFinite(goal) ? Math.round(goal) : DEFAULT_WEEKLY_GOAL;
  return Math.min(MAX_WEEKLY_GOAL, Math.max(MIN_WEEKLY_GOAL, n));
}

export function weekProgress(workouts: WorkoutLike[], goalInput: number, now: Date = new Date()): WeekProgress {
  const goal = clampGoal(goalInput);
  const start = weekStart(now);
  const end = addDays(start, 7);
  const todayKey = dayKey(now);
  const dayset = workoutDays(workouts);

  let done = 0;
  for (const w of workouts) {
    if (!counts(w)) continue;
    const d = new Date(w.startTime);
    if (!Number.isNaN(d.getTime()) && d >= start && d < end) done++;
  }

  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const key = dayKey(date);
    return { date, key, done: dayset.has(key), isToday: key === todayKey, isFuture: key > todayKey };
  });

  const daysLeft = days.filter(d => d.key >= todayKey).length;
  const remaining = Math.max(0, goal - done);
  // Today only counts as available if nothing was logged today yet.
  const slots = days.filter(d => d.key > todayKey).length + (dayset.has(todayKey) ? 0 : 1);

  return { done, goal, remaining, daysLeft, reachable: remaining <= slots, reached: done >= goal, days };
}
