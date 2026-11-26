import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, TrendingUp, Trophy, ArrowLeft, Dumbbell, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { loadExerciseHistory, ExerciseHistory, HistoryMap } from '../services/progressService';
import { personalRecords, sessionStats, formatSet, ExerciseSession } from '../lib/progression';

const fmtDate = (iso: string) => format(new Date(iso), 'dd/MM/yyyy');

/** Value plotted for a session: estimated 1RM for weighted work, best reps for bodyweight. */
function chartValue(session: ExerciseSession): number {
  const st = sessionStats(session);
  return st.bestE1RM > 0 ? st.bestE1RM : st.maxReps;
}

function isWeighted(h: ExerciseHistory) {
  return h.sessions.some(s => s.sets.some(set => set.weight > 0));
}

/** True when the latest session beat everything before it. */
function latestIsPR(h: ExerciseHistory): boolean {
  if (h.sessions.length < 2) return false;
  const latest = chartValue(h.sessions[h.sessions.length - 1]);
  const before = Math.max(...h.sessions.slice(0, -1).map(chartValue));
  return latest > before;
}

export default function ProgressView() {
  const [history, setHistory] = useState<HistoryMap | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadExerciseHistory(true)
      .then(h => !cancelled && setHistory(h))
      .catch(e => {
        console.error('Error loading progress:', e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const exercises = useMemo(() => {
    if (!history) return [];
    return ([...history.values()] as ExerciseHistory[]).sort((a, b) =>
      b.sessions[b.sessions.length - 1].date.localeCompare(a.sessions[a.sessions.length - 1].date)
    );
  }, [history]);

  const filtered = useMemo(
    () => exercises.filter(e => e.exerciseName.toLowerCase().includes(search.toLowerCase())),
    [exercises, search]
  );

  const recentPRs = useMemo(() => exercises.filter(latestIsPR).slice(0, 5), [exercises]);
  const selected = selectedId && history ? history.get(selectedId) ?? null : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      <header>
        <h2 className="text-2xl font-black italic tracking-tight uppercase">Tiến bộ</h2>
        <p className="text-brand/40 font-mono text-xs uppercase tracking-widest mt-1">
          Kỷ lục cá nhân và xu hướng sức mạnh theo từng bài
        </p>
      </header>

      {!history && !error && (
        <div className="flex flex-col items-center py-20 opacity-40">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-xs font-mono uppercase tracking-widest">Đang tải dữ liệu…</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">Không tải được dữ liệu tiến bộ. Vui lòng thử lại sau.</p>}

      {history && exercises.length === 0 && (
        <div className="glass-panel p-12 text-center space-y-3">
          <TrendingUp className="w-8 h-8 mx-auto opacity-30" />
          <p className="font-bold">Chưa có dữ liệu</p>
          <p className="text-sm text-brand/40 max-w-sm mx-auto">
            Hoàn thành vài buổi tập có ghi mức tạ và số rep để xem kỷ lục và biểu đồ tiến bộ ở đây.
          </p>
        </div>
      )}

      {history && exercises.length > 0 && !selected && (
        <>
          {recentPRs.length > 0 && (
            <section className="glass-panel p-5 space-y-3 border-accent/30">
              <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-accent">
                <Trophy className="w-4 h-4" /> Kỷ lục mới ở buổi gần nhất
              </p>
              <ul className="space-y-2">
                {recentPRs.map(h => {
                  const last = h.sessions[h.sessions.length - 1];
                  return (
                    <li key={h.exerciseId}>
                      <button onClick={() => setSelectedId(h.exerciseId)} className="w-full flex items-center justify-between text-left hover:text-accent transition-colors">
                        <span className="font-bold">{h.exerciseName}</span>
                        <span className="font-mono text-xs text-brand/60">{formatSet(sessionStats(last).topSet)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm bài tập đã tập…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-accent/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(h => {
              const last = h.sessions[h.sessions.length - 1];
              const pr = personalRecords(h.sessions);
              return (
                <button
                  key={h.exerciseId}
                  onClick={() => setSelectedId(h.exerciseId)}
                  className="glass-panel p-4 text-left hover:border-accent/40 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold">{h.exerciseName}</h3>
                    {latestIsPR(h) && (
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-accent/20 text-accent text-[10px] font-mono uppercase">PR</span>
                    )}
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40 mt-1">
                    {h.sessions.length} buổi • gần nhất {fmtDate(last.date)}
                  </p>
                  <p className="text-xs text-brand/60 mt-2">
                    {isWeighted(h) && pr.maxWeight ? `Nặng nhất ${pr.maxWeight.value} kg` : pr.maxReps ? `Nhiều nhất ${pr.maxReps.value} rep` : ''}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] font-mono text-brand/30 text-center">Dựa trên 60 buổi tập gần nhất</p>
        </>
      )}

      {selected && <ExerciseDetail history={selected} onBack={() => setSelectedId(null)} />}
    </motion.div>
  );
}

function ExerciseDetail({ history, onBack }: { history: ExerciseHistory; onBack: () => void }) {
  const weighted = isWeighted(history);
  const pr = personalRecords(history.sessions);
  const points = history.sessions.map(s => ({ date: s.date, value: chartValue(s) }));
  const recent = [...history.sessions].reverse();

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-brand/50 hover:text-accent">
        <ArrowLeft className="w-4 h-4" /> Tất cả bài tập
      </button>

      <div className="flex items-center gap-3">
        <Dumbbell className="w-6 h-6 text-accent" />
        <h3 className="text-xl font-bold">{history.exerciseName}</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {weighted && <StatCard label="Mức tạ nặng nhất" value={pr.maxWeight ? `${pr.maxWeight.value} kg` : '–'} date={pr.maxWeight?.date} />}
        {weighted && <StatCard label="1RM ước tính" value={pr.bestE1RM ? `${pr.bestE1RM.value} kg` : '–'} date={pr.bestE1RM?.date} />}
        <StatCard label="Nhiều rep nhất" value={pr.maxReps ? `${pr.maxReps.value}` : '–'} date={pr.maxReps?.date} />
        <StatCard label="Khối lượng cao nhất" value={pr.maxVolume ? `${Math.round(pr.maxVolume.value)} kg` : '–'} date={pr.maxVolume?.date} />
      </div>

      <section className="glass-panel p-5 space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">
          {weighted ? '1RM ước tính theo buổi (kg)' : 'Rep nhiều nhất mỗi buổi'}
        </p>
        {points.length >= 2 ? <LineChart points={points} /> : (
          <p className="text-xs text-brand/40">Cần ít nhất 2 buổi tập để vẽ biểu đồ.</p>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Các buổi gần đây</p>
        <ul className="divide-y divide-white/5 glass-panel">
          {recent.slice(0, 12).map(s => (
            <li key={s.workoutId} className="p-4 flex items-start justify-between gap-4 text-sm">
              <span className="font-mono text-xs text-brand/50 shrink-0">{fmtDate(s.date)}</span>
              <span className="text-right text-brand/80">
                {s.sets.map(set => (set.weight > 0 ? `${set.weight}×${set.reps}` : `${set.reps}`)).join(' • ')}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value, date }: { label: string; value: string; date?: string }) {
  return (
    <div className="glass-panel p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">{label}</p>
      <p className="text-xl font-black mt-1">{value}</p>
      {date && <p className="text-[10px] text-brand/30 mt-1">{fmtDate(date)}</p>}
    </div>
  );
}

function LineChart({ points }: { points: { date: string; value: number }[] }) {
  const W = 600;
  const H = 180;
  const pad = { l: 36, r: 12, t: 12, b: 24 };
  const values = points.map(p => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = max - min;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / range) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const bestIdx = values.indexOf(Math.max(...values));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Biểu đồ tiến bộ">
      {[min, (min + max) / 2, max].map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity="0.08" />
          <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.4">
            {Math.round(v * 10) / 10}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#FF6B00" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === bestIdx ? 5 : 3} fill={i === bestIdx ? '#FF6B00' : '#141414'} stroke="#FF6B00" strokeWidth="2" />
      ))}
      <text x={pad.l} y={H - 6} fontSize="10" fill="currentColor" fillOpacity="0.4">
        {fmtDate(points[0].date)}
      </text>
      <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.4">
        {fmtDate(points[points.length - 1].date)}
      </text>
    </svg>
  );
}
