import { describe, it, expect } from 'vitest';
import {
  validateEntry,
  isValidDateString,
  toDateString,
  seriesFor,
  latestValue,
  changeOver,
  movingAverage,
  bmiFor,
  bmiSeries,
  trendTone,
  formatDelta,
  waistHipRatio,
  Measurement,
} from './bodyMetrics';

const m = (date: string, extra: Partial<Measurement> = {}, id = date): Measurement => ({ id, date, ...extra });

describe('validateEntry', () => {
  it('accepts a single valid metric', () => {
    expect(validateEntry({ weight: 70 })).toMatchObject({ ok: true, empty: false });
  });

  it('is empty when nothing is filled in', () => {
    expect(validateEntry({})).toMatchObject({ ok: false, empty: true });
    expect(validateEntry({ weight: null, waist: undefined, bodyFat: NaN })).toMatchObject({ ok: false, empty: true });
  });

  it('rejects values outside the plausible range with a message naming the metric', () => {
    const r = validateEntry({ weight: 10, bodyFat: 80 });
    expect(r.ok).toBe(false);
    expect(r.errors.weight).toContain('Cân nặng');
    expect(r.errors.bodyFat).toContain('% mỡ');
  });

  it('accepts values on the boundaries', () => {
    expect(validateEntry({ weight: 20, bodyFat: 70 }).ok).toBe(true);
  });

  it('rejects Infinity', () => {
    expect(validateEntry({ weight: Infinity }).ok).toBe(false);
  });
});

describe('dates', () => {
  it('validates calendar dates', () => {
    expect(isValidDateString('2026-02-28')).toBe(true);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('26-02-28')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  it('formats local dates without timezone shifts', () => {
    expect(toDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDateString(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });
});

describe('seriesFor / latestValue', () => {
  const data = [
    m('2026-01-10', { weight: 72 }),
    m('2026-01-01', { weight: 75, waist: 90 }),
    m('2026-01-20', { waist: 88 }),
  ];

  it('returns chronological points and skips entries without the metric', () => {
    expect(seriesFor(data, 'weight')).toEqual([
      { date: '2026-01-01', value: 75 },
      { date: '2026-01-10', value: 72 },
    ]);
    expect(seriesFor(data, 'waist').map(p => p.value)).toEqual([90, 88]);
  });

  it('keeps the last entry when a day has several', () => {
    const s = seriesFor([m('2026-01-01', { weight: 70 }, 'a'), m('2026-01-01', { weight: 71 }, 'b')], 'weight');
    expect(s).toEqual([{ date: '2026-01-01', value: 71 }]);
  });

  it('finds the latest value and handles missing metrics', () => {
    expect(latestValue(data, 'weight')).toEqual({ date: '2026-01-10', value: 72 });
    expect(latestValue(data, 'arm')).toBeNull();
  });
});

describe('changeOver', () => {
  const data = [
    m('2026-01-01', { weight: 80 }),
    m('2026-01-15', { weight: 78.5 }),
    m('2026-01-29', { weight: 77 }),
    m('2026-02-05', { weight: 76.2 }),
  ];

  it('compares with the newest entry at least N days old', () => {
    const c = changeOver(data, 'weight', 14)!;
    expect(c.from.date).toBe('2026-01-15'); // 21 days before 02-05 is too old, 01-15 is the newest <= 01-22
    expect(c.delta).toBe(-2.3);
  });

  it('falls back to the oldest entry when history is shorter than the window', () => {
    const c = changeOver(data, 'weight', 365)!;
    expect(c.from.date).toBe('2026-01-01');
    expect(c.delta).toBe(-3.8);
    expect(c.days).toBe(35);
  });

  it('needs at least two points', () => {
    expect(changeOver([m('2026-01-01', { weight: 80 })], 'weight', 7)).toBeNull();
    expect(changeOver([], 'weight', 7)).toBeNull();
  });
});

describe('movingAverage', () => {
  it('averages a trailing window', () => {
    const pts = [10, 20, 30, 40].map((value, i) => ({ date: `2026-01-0${i + 1}`, value }));
    expect(movingAverage(pts, 2).map(p => p.value)).toEqual([10, 15, 25, 35]);
  });
});

describe('BMI helpers', () => {
  it('computes BMI rounded to one decimal', () => {
    expect(bmiFor(70, 175)).toBe(22.9);
    expect(bmiFor(0, 175)).toBeNull();
    expect(bmiFor(70, 0)).toBeNull();
  });

  it('converts the weight history to BMI', () => {
    const s = bmiSeries([m('2026-01-01', { weight: 70 }), m('2026-01-02', { waist: 80 }), m('2026-01-03', { weight: 80 })], 175);
    expect(s).toEqual([
      { date: '2026-01-01', value: 22.9 },
      { date: '2026-01-03', value: 26.1 },
    ]);
  });
});

describe('trendTone / formatDelta / waistHipRatio', () => {
  it('judges direction per metric', () => {
    expect(trendTone('bodyFat', -1)).toBe('good');
    expect(trendTone('bodyFat', 1)).toBe('bad');
    expect(trendTone('arm', 1)).toBe('good');
    expect(trendTone('arm', -1)).toBe('bad');
    expect(trendTone('weight', -3)).toBe('neutral');
    expect(trendTone('waist', 0)).toBe('neutral');
  });

  it('formats signed deltas', () => {
    expect(formatDelta(1.5, 'kg')).toBe('+1.5 kg');
    expect(formatDelta(-2, 'cm')).toBe('−2 cm');
    expect(formatDelta(0, 'kg')).toBe('0 kg');
  });

  it('computes waist-to-hip ratio', () => {
    expect(waistHipRatio(80, 100)).toBe(0.8);
    expect(waistHipRatio(80, undefined)).toBeNull();
    expect(waistHipRatio(80, 0)).toBeNull();
  });
});
