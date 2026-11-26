import { describe, it, expect } from 'vitest';
import { dayKey, workoutDays, streakInfo, weekStart, weekProgress, clampGoal, WorkoutLike } from './streak';

// Wednesday 2026-06-17, midday, local time.
const NOW = new Date(2026, 5, 17, 12, 0, 0);

const at = (y: number, m: number, d: number, h = 9): WorkoutLike => ({
  startTime: new Date(y, m - 1, d, h).toISOString(),
  status: 'completed',
});
const daysAgo = (n: number): WorkoutLike => at(2026, 6, 17 - n);

describe('dayKey / workoutDays', () => {
  it('formats local days', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('ignores non-completed workouts and bad dates, keeps legacy entries without status', () => {
    const days = workoutDays([
      { startTime: new Date(2026, 5, 1, 9).toISOString(), status: 'cancelled' },
      { startTime: new Date(2026, 5, 2, 9).toISOString(), status: 'active' },
      { startTime: 'not a date', status: 'completed' },
      { startTime: new Date(2026, 5, 3, 9).toISOString() },
    ]);
    expect([...days]).toEqual(['2026-06-03']);
  });

  it('merges several workouts on one day', () => {
    expect(workoutDays([at(2026, 6, 10, 7), at(2026, 6, 10, 20)]).size).toBe(1);
  });
});

describe('streakInfo', () => {
  it('counts consecutive days ending today', () => {
    const s = streakInfo([daysAgo(0), daysAgo(1), daysAgo(2)], NOW);
    expect(s).toMatchObject({ current: 3, doneToday: true, atRisk: false });
  });

  it('keeps the streak alive through yesterday and flags it as at risk', () => {
    const s = streakInfo([daysAgo(1), daysAgo(2)], NOW);
    expect(s).toMatchObject({ current: 2, doneToday: false, atRisk: true });
  });

  it('breaks after a two day gap', () => {
    const s = streakInfo([daysAgo(2), daysAgo(3)], NOW);
    expect(s).toMatchObject({ current: 0, atRisk: false });
    expect(s.longest).toBe(2);
  });

  it('finds the longest run in the past', () => {
    const history = [daysAgo(20), daysAgo(19), daysAgo(18), daysAgo(17), daysAgo(5), daysAgo(4), daysAgo(0)];
    const s = streakInfo(history, NOW);
    expect(s.longest).toBe(4);
    expect(s.current).toBe(1);
  });

  it('handles month boundaries', () => {
    const now = new Date(2026, 6, 2, 12);
    const s = streakInfo([at(2026, 7, 2), at(2026, 7, 1), at(2026, 6, 30), at(2026, 6, 29)], now);
    expect(s.current).toBe(4);
  });

  it('is empty without workouts', () => {
    expect(streakInfo([], NOW)).toEqual({ current: 0, longest: 0, doneToday: false, atRisk: false });
  });
});

describe('weekStart', () => {
  it('returns Monday for midweek, Sunday and Monday dates', () => {
    expect(dayKey(weekStart(new Date(2026, 5, 17)))).toBe('2026-06-15'); // Wed
    expect(dayKey(weekStart(new Date(2026, 5, 21)))).toBe('2026-06-15'); // Sun belongs to the week that began Monday
    expect(dayKey(weekStart(new Date(2026, 5, 15)))).toBe('2026-06-15'); // Mon
  });
});

describe('weekProgress', () => {
  it('counts only workouts from this week', () => {
    const w = weekProgress([at(2026, 6, 15), at(2026, 6, 16), at(2026, 6, 14), at(2026, 6, 8)], 3, NOW);
    expect(w.done).toBe(2);
    expect(w.remaining).toBe(1);
    expect(w.reached).toBe(false);
  });

  it('builds Monday to Sunday with today and future markers', () => {
    const w = weekProgress([at(2026, 6, 15)], 3, NOW);
    expect(w.days.map(d => d.key)).toEqual([
      '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21',
    ]);
    expect(w.days[0].done).toBe(true);
    expect(w.days[2].isToday).toBe(true);
    expect(w.days[3].isFuture).toBe(true);
    expect(w.daysLeft).toBe(5); // Wed..Sun
  });

  it('reports a reached goal', () => {
    const w = weekProgress([at(2026, 6, 15), at(2026, 6, 16), at(2026, 6, 17)], 3, NOW);
    expect(w).toMatchObject({ reached: true, remaining: 0 });
  });

  it('knows when the goal can no longer be reached', () => {
    // Saturday with 1 of 5 workouts done: Saturday + Sunday are the only slots left.
    const sat = new Date(2026, 5, 20, 12);
    const w = weekProgress([at(2026, 6, 15)], 5, sat);
    expect(w.reachable).toBe(false);
    expect(weekProgress([at(2026, 6, 15)], 3, sat).reachable).toBe(true);
  });

  it('does not count today as an open slot when today is already done', () => {
    const sun = new Date(2026, 5, 21, 12);
    const w = weekProgress([at(2026, 6, 21)], 3, sun);
    expect(w.done).toBe(1);
    expect(w.reachable).toBe(false); // nothing left after Sunday
  });
});

describe('clampGoal', () => {
  it.each([
    [0, 1],
    [3, 3],
    [10, 7],
    [2.6, 3],
    [NaN, 3],
    ['5' as unknown as number, 3],
  ])('%s -> %s', (input, out) => expect(clampGoal(input)).toBe(out));
});
