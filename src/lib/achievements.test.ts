import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BADGES, calculateAchievementStats, getBadgeProgress, isBadgeUnlocked } from './achievements';
import { Workout } from '../types';

const DAY = 24 * 60 * 60 * 1000;

function workout(startMs: number, extra: Partial<Workout> = {}): Workout {
  return {
    id: String(startMs),
    userId: 'u',
    name: 'w',
    startTime: new Date(startMs).toISOString(),
    status: 'completed',
    ...extra,
  };
}

describe('badge definitions', () => {
  it('have unique ids and positive targets', () => {
    const ids = BADGES.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    BADGES.forEach(b => expect(b.targetValue).toBeGreaterThan(0));
  });
});

describe('calculateAchievementStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  const now = () => Date.now();

  it('ignores workouts that are not completed', () => {
    const stats = calculateAchievementStats([workout(now()), workout(now() - DAY, { status: 'active' })]);
    expect(stats.workoutsCount).toBe(1);
  });

  it('sums volume and tracks the best single-workout calories and duration', () => {
    const stats = calculateAchievementStats([
      workout(now(), { totalVolume: 1000, calories: 300, duration: 3600 }),
      workout(now() - 10 * DAY, { totalVolume: 500, calories: 500, duration: 1800 }),
    ]);
    expect(stats.volume).toBe(1500);
    expect(stats.calories).toBe(500);
    expect(stats.totalCalories).toBe(800);
    expect(stats.duration).toBe(60);
    expect(stats.totalDurationMinutes).toBe(90);
  });

  it('counts a streak of consecutive days ending today', () => {
    const stats = calculateAchievementStats([workout(now()), workout(now() - DAY), workout(now() - 2 * DAY)]);
    expect(stats.streak).toBe(3);
  });

  it('keeps the streak alive if the last workout was yesterday', () => {
    expect(calculateAchievementStats([workout(now() - DAY), workout(now() - 2 * DAY)]).streak).toBe(2);
  });

  it('resets the streak after a gap of two days', () => {
    expect(calculateAchievementStats([workout(now() - 2 * DAY), workout(now() - 3 * DAY)]).streak).toBe(0);
  });

  it('counts several workouts on one day once', () => {
    expect(calculateAchievementStats([workout(now()), workout(now() - 1000)]).streak).toBe(1);
  });

  it('measures weeks with 3+ workouts in a row', () => {
    const week = (n: number) => [0, 1, 2].map(d => workout(now() - n * 7 * DAY - d * DAY));
    const stats = calculateAchievementStats([...week(0), ...week(1), ...week(2)]);
    expect(stats.weekly).toBeGreaterThanOrEqual(2);
  });

  it('returns zeros without workouts', () => {
    expect(calculateAchievementStats([])).toMatchObject({ workoutsCount: 0, streak: 0, volume: 0, weekly: 0 });
  });
});

describe('badge progress', () => {
  const stats = {
    workoutsCount: 5,
    volume: 0,
    calories: 0,
    totalCalories: 0,
    streak: 0,
    duration: 0,
    totalDurationMinutes: 0,
    weekly: 0,
  };
  const rookie = BADGES.find(b => b.id === 'cyber_rookie')!;
  const tenWorkouts = BADGES.find(b => b.id === 'endurance_warrior')!;

  it('caps percentage at 100 and unlocks at the target', () => {
    expect(getBadgeProgress(rookie, stats).percentage).toBe(100);
    expect(isBadgeUnlocked('cyber_rookie', [], stats)).toBe(true);
  });

  it('shows partial progress', () => {
    expect(getBadgeProgress(tenWorkouts, stats)).toMatchObject({ current: 5, target: 10, percentage: 50 });
    expect(isBadgeUnlocked('endurance_warrior', [], stats)).toBe(false);
  });

  it('treats an already unlocked badge as unlocked and unknown ids as locked', () => {
    expect(isBadgeUnlocked('endurance_warrior', [{ badgeId: 'endurance_warrior' }], stats)).toBe(true);
    expect(isBadgeUnlocked('does_not_exist', [], stats)).toBe(false);
  });
});
