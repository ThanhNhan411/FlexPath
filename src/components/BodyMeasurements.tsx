import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Loader2, Plus, Trash2, Scale, Ruler } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import LineChart from './LineChart';
import { addMeasurement, deleteMeasurement, fetchMeasurements, syncWeightToProfile } from '../services/bodyMeasurementService';
import {
  METRICS,
  METRIC_BY_KEY,
  Measurement,
  MetricKey,
  bmiSeries,
  changeOver,
  formatDelta,
  latestValue,
  seriesFor,
  toDateString,
  trendTone,
  validateEntry,
  waistHipRatio,
} from '../lib/bodyMetrics';
import { cn } from '../lib/utils';

const RANGES = [
  { key: '30', label: '30 ngày', days: 30 },
  { key: '90', label: '90 ngày', days: 90 },
  { key: 'all', label: 'Tất cả', days: Infinity },
] as const;

const fmtDay = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

type ChartKey = MetricKey | 'bmi';

const TONE_CLASS = { good: 'text-emerald-400', bad: 'text-red-400', neutral: 'text-brand/50' } as const;

export default function BodyMeasurements() {
  const [items, setItems] = useState<Measurement[] | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(toDateString());
  const [inputs, setInputs] = useState<Partial<Record<MetricKey, string>>>({});
  const [note, setNote] = useState('');
  const [syncProfile, setSyncProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [chartKey, setChartKey] = useState<ChartKey>('weight');
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('90');

  const load = useCallback(async () => {
    try {
      setItems(await fetchMeasurements());
      setError(null);
    } catch (e) {
      console.error('Error loading measurements:', e);
      setError('Không tải được số đo. Vui lòng thử lại sau.');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
    (async () => {
      try {
        if (!auth.currentUser) return;
        const snap = await getDoc(doc(db, 'health_profiles', auth.currentUser.uid));
        const h = snap.exists() ? snap.data().height : null;
        if (typeof h === 'number') setHeight(h);
      } catch (e) {
        console.error('Error loading height:', e);
      }
    })();
  }, [load]);

  const parsed = useMemo(() => {
    const out: Partial<Record<MetricKey, number>> = {};
    for (const m of METRICS) {
      const raw = (inputs[m.key] ?? '').trim().replace(',', '.');
      if (raw !== '') out[m.key] = Number(raw);
    }
    return out;
  }, [inputs]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const check = validateEntry(parsed);
    if (check.empty) return setFormError('Hãy nhập ít nhất một chỉ số.');
    if (!check.ok) return setFormError(Object.values(check.errors)[0] ?? 'Giá trị không hợp lệ.');
    if (date > toDateString()) return setFormError('Không thể chọn ngày trong tương lai.');

    setSaving(true);
    try {
      await addMeasurement({ date, values: parsed, note });
      if (syncProfile && parsed.weight !== undefined) {
        // Only the newest weight should update the profile, not backfilled older entries.
        const newest = latestValue(items ?? [], 'weight');
        if (!newest || date >= newest.date) {
          await syncWeightToProfile(parsed.weight).catch(err => console.error('Profile sync failed:', err));
        }
      }
      setInputs({});
      setNote('');
      await load();
    } catch (err: any) {
      console.error('Error saving measurement:', err);
      setFormError(err?.message || 'Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa lần đo này?')) return;
    try {
      await deleteMeasurement(id);
      setItems(prev => (prev ? prev.filter(m => m.id !== id) : prev));
    } catch (e) {
      console.error('Error deleting measurement:', e);
      setError('Xóa thất bại. Vui lòng thử lại.');
    }
  };

  const list = items ?? [];

  const chartPoints = useMemo(() => {
    const all = chartKey === 'bmi' ? (height ? bmiSeries(list, height) : []) : seriesFor(list, chartKey);
    const days = RANGES.find(r => r.key === range)!.days;
    if (!Number.isFinite(days) || all.length === 0) return all;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cut = toDateString(cutoff);
    return all.filter(p => p.date >= cut);
  }, [list, chartKey, range, height]);

  const availableKeys = useMemo(() => {
    const keys: ChartKey[] = METRICS.map(m => m.key).filter(k => seriesFor(list, k).length > 0);
    if (height && keys.includes('weight')) keys.splice(keys.indexOf('weight') + 1, 0, 'bmi');
    return keys;
  }, [list, height]);

  const summaryKeys = (['weight', 'bodyFat', 'waist'] as MetricKey[]).filter(k => latestValue(list, k));
  const ratio = waistHipRatio(latestValue(list, 'waist')?.value, latestValue(list, 'hips')?.value);

  const chartUnit = chartKey === 'bmi' ? '' : METRIC_BY_KEY[chartKey].unit;
  const chartLabel = chartKey === 'bmi' ? 'BMI' : METRIC_BY_KEY[chartKey].label;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Số đo cơ thể</h1>
        <p className="text-brand/60 uppercase font-mono text-sm tracking-widest mt-2">Theo dõi cân nặng, % mỡ và các vòng</p>
      </header>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {items === null && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      )}

      {summaryKeys.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryKeys.map(k => {
            const def = METRIC_BY_KEY[k];
            const last = latestValue(list, k)!;
            const ch = changeOver(list, k, 30);
            return (
              <div key={k} className="glass-panel p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">{def.label}</p>
                <p className="text-2xl font-black mt-1">
                  {last.value} <span className="text-sm font-medium text-brand/40">{def.unit}</span>
                </p>
                {ch ? (
                  <p className={cn('text-xs mt-1 font-mono', TONE_CLASS[trendTone(k, ch.delta)])}>
                    {formatDelta(ch.delta, def.unit)} / {ch.days} ngày
                  </p>
                ) : (
                  <p className="text-xs mt-1 text-brand/30">Cần thêm lần đo</p>
                )}
              </div>
            );
          })}
          {ratio !== null && (
            <div className="glass-panel p-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Eo / Mông</p>
              <p className="text-2xl font-black mt-1">{ratio}</p>
              <p className="text-xs mt-1 text-brand/30">Tỷ lệ gần nhất</p>
            </div>
          )}
        </div>
      )}

      {availableKeys.length > 0 && (
        <section className="glass-panel p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {availableKeys.map(k => (
                <button
                  key={k}
                  onClick={() => setChartKey(k)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-all',
                    chartKey === k ? 'bg-accent border-accent text-white' : 'bg-white/5 border-white/10 text-brand/60 hover:border-white/20'
                  )}
                >
                  {k === 'bmi' ? 'BMI' : METRIC_BY_KEY[k].label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-all',
                    range === r.key ? 'bg-white/15 border-white/30' : 'bg-transparent border-white/10 text-brand/50'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">
            {chartLabel} {chartUnit && `(${chartUnit})`}
          </p>
          {chartPoints.length >= 2 ? (
            <LineChart points={chartPoints} highlight="last" ariaLabel={`Biểu đồ ${chartLabel}`} />
          ) : (
            <p className="text-xs text-brand/40 py-6 text-center">Cần ít nhất 2 lần đo trong khoảng thời gian này để vẽ biểu đồ.</p>
          )}
        </section>
      )}

      <section className="glass-panel p-6 space-y-5">
        <h2 className="text-lg font-bold font-mono tracking-tight flex items-center gap-2">
          <Plus className="w-5 h-5 text-accent" /> Thêm lần đo
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block space-y-1.5 max-w-xs">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Ngày đo</span>
            <input
              type="date"
              value={date}
              max={toDateString()}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
              required
            />
          </label>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {METRICS.map(m => (
              <label key={m.key} className="block space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand/40 flex items-center gap-1.5">
                  {m.key === 'weight' ? <Scale className="w-3 h-3" /> : <Ruler className="w-3 h-3" />}
                  {m.label} ({m.unit})
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={m.step}
                  min={m.min}
                  max={m.max}
                  value={inputs[m.key] ?? ''}
                  onChange={e => setInputs(prev => ({ ...prev, [m.key]: e.target.value }))}
                  placeholder="—"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
                />
              </label>
            ))}
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Ghi chú (không bắt buộc)</span>
            <input
              value={note}
              maxLength={500}
              onChange={e => setNote(e.target.value)}
              placeholder="Ví dụ: đo buổi sáng, lúc đói"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
            />
          </label>

          {parsed.weight !== undefined && (
            <label className="flex items-center gap-2 text-xs text-brand/60 cursor-pointer">
              <input type="checkbox" checked={syncProfile} onChange={e => setSyncProfile(e.target.checked)} className="accent-[#FF6B00]" />
              Cập nhật cân nặng và BMI trong hồ sơ sức khỏe
            </label>
          )}

          {formError && <p className="text-xs text-red-400">{formError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-accent/20 hover:bg-accent/80 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Lưu lần đo
          </button>
        </form>
      </section>

      {list.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Lịch sử đo</p>
          <ul className="glass-panel divide-y divide-white/5">
            {list.slice(0, 30).map(m => (
              <li key={m.id} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <p className="font-mono text-xs text-brand/50">{fmtDay(m.date)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {METRICS.filter(def => typeof m[def.key] === 'number').map(def => (
                      <span key={def.key} className="px-2 py-1 bg-white/5 rounded-md text-[11px] font-mono">
                        {def.label}: <b>{m[def.key]}</b> {def.unit}
                      </span>
                    ))}
                  </div>
                  {m.note && <p className="text-xs text-brand/40">{m.note}</p>}
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  aria-label="Xóa lần đo"
                  className="p-2 text-red-500/50 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {items !== null && list.length === 0 && !error && (
        <p className="text-sm text-brand/40 text-center">Chưa có lần đo nào. Hãy thêm lần đầu để bắt đầu theo dõi.</p>
      )}
    </motion.div>
  );
}
