import { describe, it, expect } from 'vitest';
import {
  estimate1RM,
  sessionStats,
  personalRecords,
  isSetPR,
  suggestNext,
  weightIncrement,
  formatSet,
  ExerciseSession,
} from './progression';

const sess = (date: string, sets: [number, number][]): ExerciseSession => ({
  workoutId: date,
  date,
  sets: sets.map(([weight, reps]) => ({ weight, reps })),
});

describe('estimate1RM', () => {
  it('returns the weight for a single rep', () => expect(estimate1RM(100, 1)).toBe(100));
  it('uses the Epley formula', () => expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 2));
  it('is 0 for bodyweight or empty sets', () => {
    expect(estimate1RM(0, 12)).toBe(0);
    expect(estimate1RM(50, 0)).toBe(0);
  });
});

describe('sessionStats', () => {
  const stats = sessionStats(sess('2026-01-01', [[40, 8], [40, 8], [45, 5]]));
  it('aggregates weight, reps and volume', () => {
    expect(stats.maxWeight).toBe(45);
    expect(stats.maxReps).toBe(8);
    expect(stats.volume).toBe(40 * 8 * 2 + 45 * 5);
  });
  it('picks the top set by estimated 1RM (45x5 beats 40x8)', () => {
    expect(stats.topSet).toEqual({ weight: 45, reps: 5 });
  });
  it('uses reps for bodyweight sessions', () => {
    expect(sessionStats(sess('d', [[0, 10], [0, 14], [0, 9]])).topSet).toEqual({ weight: 0, reps: 14 });
  });
  it('ignores zero-rep sets', () => {
    expect(sessionStats(sess('d', [[50, 0]])).topSet).toBeNull();
  });
});

describe('personalRecords', () => {
  const history = [
    sess('2026-01-01', [[40, 8], [40, 8]]),
    sess('2026-01-08', [[42.5, 8], [42.5, 7]]),
    sess('2026-01-15', [[40, 8]]),
  ];
  const pr = personalRecords(history);

  it('finds the heaviest weight and when it happened', () => {
    expect(pr.maxWeight).toEqual({ value: 42.5, date: '2026-01-08' });
  });
  it('finds the best e1RM', () => expect(pr.bestE1RM?.date).toBe('2026-01-08'));
  it('keeps the earliest date on ties', () => expect(pr.maxReps).toEqual({ value: 8, date: '2026-01-01' }));
  it('is empty without data', () => {
    expect(personalRecords([])).toEqual({ maxWeight: null, bestE1RM: null, maxReps: null, maxVolume: null });
  });
});

describe('isSetPR', () => {
  const history = [sess('2026-01-01', [[40, 8]]), sess('2026-01-08', [[42.5, 8]])];

  it('flags a set that beats the best e1RM', () => expect(isSetPR(history, { weight: 45, reps: 8 })).toBe(true));
  it('does not flag an equal set', () => expect(isSetPR(history, { weight: 42.5, reps: 8 })).toBe(false));
  it('does not flag a lighter set', () => expect(isSetPR(history, { weight: 30, reps: 10 })).toBe(false));
  it('never flags the first ever set', () => expect(isSetPR([], { weight: 50, reps: 5 })).toBe(false));

  it('compares reps for bodyweight exercises', () => {
    const bw = [sess('2026-01-01', [[0, 10], [0, 8]])];
    expect(isSetPR(bw, { weight: 0, reps: 12 })).toBe(true);
    expect(isSetPR(bw, { weight: 0, reps: 9 })).toBe(false);
  });
});

describe('weightIncrement', () => {
  it.each([
    [10, 1],
    [19.5, 1],
    [20, 2.5],
    [59, 2.5],
    [60, 5],
    [140, 5],
  ])('%s kg -> +%s', (w, inc) => expect(weightIncrement(w)).toBe(inc));
});

describe('suggestNext', () => {
  it('adds weight when every top set hit the target reps', () => {
    expect(suggestNext(sess('d', [[40, 8], [40, 8], [40, 9]]), 8)).toMatchObject({ weight: 42.5, reps: 8 });
  });
  it('keeps the weight when reps were missed', () => {
    expect(suggestNext(sess('d', [[40, 8], [40, 6]]), 8)).toMatchObject({ weight: 40, reps: 8 });
  });
  it('only looks at the heaviest sets, ignoring warm-ups', () => {
    expect(suggestNext(sess('d', [[20, 10], [60, 8], [60, 8]]), 8)?.weight).toBe(65);
  });
  it('adds a rep for bodyweight work when targets were hit', () => {
    expect(suggestNext(sess('d', [[0, 10], [0, 10]]), 10)).toMatchObject({ weight: 0, reps: 11 });
  });
  it('asks for the target reps for bodyweight work when missed', () => {
    expect(suggestNext(sess('d', [[0, 10], [0, 7]]), 10)).toMatchObject({ weight: 0, reps: 10 });
  });
  it('returns null without usable history', () => {
    expect(suggestNext(undefined, 8)).toBeNull();
    expect(suggestNext(sess('d', []), 8)).toBeNull();
  });
});

describe('formatSet', () => {
  it('formats weighted and bodyweight sets', () => {
    expect(formatSet({ weight: 40, reps: 8 })).toBe('40 kg × 8');
    expect(formatSet({ weight: 0, reps: 12 })).toBe('12 rep');
    expect(formatSet(null)).toBe('–');
  });
});
