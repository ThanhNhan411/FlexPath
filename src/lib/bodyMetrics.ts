/**
 * Pure helpers for body measurement tracking (weight, body fat, circumferences).
 * No Firebase or React dependencies so everything here is unit testable.
 */

export type MetricKey = 'weight' | 'bodyFat' | 'waist' | 'chest' | 'hips' | 'arm' | 'thigh';

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  /** Inclusive plausible range, mirrored by firestore.rules. */
  min: number;
  max: number;
  step: number;
  /** For fat-loss goals a lower value is an improvement; for arm/chest/thigh muscle gain is higher. */
  better: 'lower' | 'higher' | 'neutral';
}

export const METRICS: MetricDef[] = [
  { key: 'weight', label: 'Cân nặng', unit: 'kg', min: 20, max: 500, step: 0.1, better: 'neutral' },
  { key: 'bodyFat', label: '% mỡ', unit: '%', min: 2, max: 70, step: 0.1, better: 'lower' },
  { key: 'waist', label: 'Vòng eo', unit: 'cm', min: 30, max: 250, step: 0.5, better: 'lower' },
  { key: 'chest', label: 'Vòng ngực', unit: 'cm', min: 40, max: 250, step: 0.5, better: 'neutral' },
  { key: 'hips', label: 'Vòng mông', unit: 'cm', min: 40, max: 250, step: 0.5, better: 'neutral' },
  { key: 'arm', label: 'Vòng tay', unit: 'cm', min: 10, max: 80, step: 0.5, better: 'higher' },
  { key: 'thigh', label: 'Vòng đùi', unit: 'cm', min: 20, max: 120, step: 0.5, better: 'higher' },
];

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map(m => [m.key, m])) as Record<MetricKey, MetricDef>;

export interface Measurement {
  id: string;
  /** Calendar day, yyyy-MM-dd (no timezone so it never shifts). */
  date: string;
  weight?: number;
  bodyFat?: number;
  waist?: number;
  chest?: number;
  hips?: number;
  arm?: number;
  thigh?: number;
  note?: string;
}

export type EntryInput = Partial<Record<MetricKey, number | null | undefined>>;

export interface ValidationResult {
  ok: boolean;
  /** True when no metric was filled in at all. */
  empty: boolean;
  errors: Partial<Record<MetricKey, string>>;
}

const present = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function validateEntry(input: EntryInput): ValidationResult {
  const errors: Partial<Record<MetricKey, string>> = {};
  let filled = 0;
  for (const m of METRICS) {
    const v = input[m.key];
    if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) continue;
    if (!present(v)) {
      errors[m.key] = 'Giá trị không hợp lệ';
      continue;
    }
    filled++;
    if (v < m.min || v > m.max) errors[m.key] = `${m.label} phải từ ${m.min} đến ${m.max} ${m.unit}`;
  }
  return { ok: filled > 0 && Object.keys(errors).length === 0, empty: filled === 0, errors };
}

export const isValidDateString = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

/** Local calendar day as yyyy-MM-dd. */
export function toDateString(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const dayNumber = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

export interface SeriesPoint {
  date: string;
  value: number;
}

/** Chronological values of one metric. When several entries share a day the latest one wins. */
export function seriesFor(measurements: Measurement[], key: MetricKey): SeriesPoint[] {
  const byDate = new Map<string, number>();
  const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const m of sorted) {
    const v = m[key];
    if (present(v)) byDate.set(m.date, v);
  }
  return [...byDate.entries()].map(([date, value]) => ({ date, value }));
}

export function latestValue(measurements: Measurement[], key: MetricKey): SeriesPoint | null {
  const s = seriesFor(measurements, key);
  return s.length ? s[s.length - 1] : null;
}

export interface Change {
  delta: number;
  /** Days between the baseline and the latest value. */
  days: number;
  from: SeriesPoint;
  to: SeriesPoint;
}

/**
 * Change of the latest value compared with roughly `days` days earlier: the newest entry that is at
 * least `days` old, or the oldest entry if the history is shorter. Null with fewer than two points.
 */
export function changeOver(measurements: Measurement[], key: MetricKey, days: number): Change | null {
  const s = seriesFor(measurements, key);
  if (s.length < 2) return null;
  const to = s[s.length - 1];
  const limit = dayNumber(to.date) - days;
  let from: SeriesPoint | null = null;
  for (let i = s.length - 2; i >= 0; i--) {
    if (dayNumber(s[i].date) <= limit) {
      from = s[i];
      break;
    }
  }
  if (!from) from = s[0];
  return {
    delta: Math.round((to.value - from.value) * 10) / 10,
    days: dayNumber(to.date) - dayNumber(from.date),
    from,
    to,
  };
}

/** Trailing moving average over `window` points (shorter at the start). */
export function movingAverage(points: SeriesPoint[], window = 7): SeriesPoint[] {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((a, b) => a + b.value, 0) / slice.length;
    return { date: p.date, value: Math.round(avg * 10) / 10 };
  });
}

export function bmiFor(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
}

/** Weight history converted to BMI using a fixed height. */
export function bmiSeries(measurements: Measurement[], heightCm: number): SeriesPoint[] {
  return seriesFor(measurements, 'weight')
    .map(p => ({ date: p.date, value: bmiFor(p.value, heightCm) }))
    .filter((p): p is SeriesPoint => p.value !== null);
}

/** Describe a delta as an improvement, a regression or neutral for the given metric. */
export function trendTone(key: MetricKey, delta: number): 'good' | 'bad' | 'neutral' {
  if (delta === 0) return 'neutral';
  const better = METRIC_BY_KEY[key].better;
  if (better === 'neutral') return 'neutral';
  const improving = better === 'lower' ? delta < 0 : delta > 0;
  return improving ? 'good' : 'bad';
}

export function formatDelta(delta: number, unit: string): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${sign}${Math.abs(delta)} ${unit}`;
}

/** Waist-to-hip ratio, a common health indicator. */
export function waistHipRatio(waist?: number, hips?: number): number | null {
  if (!present(waist) || !present(hips) || hips <= 0) return null;
  return Math.round((waist / hips) * 100) / 100;
}
