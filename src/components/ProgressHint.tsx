import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ExerciseHistory } from '../services/progressService';
import { formatSet, sessionStats, suggestNext } from '../lib/progression';

interface ProgressHintProps {
  history: ExerciseHistory | undefined;
  /** Target reps of the exercise (taken from its first set). */
  targetReps: number;
  /** Fill all unfinished sets with the suggestion. */
  onApply: (weight: number, reps: number) => void;
}

/** "Last time / suggested next" strip shown under an exercise in the active workout. */
export default function ProgressHint({ history, targetReps, onApply }: ProgressHintProps) {
  if (!history || history.sessions.length === 0) return null;

  const last = history.sessions[history.sessions.length - 1];
  const top = sessionStats(last).topSet;
  const suggestion = suggestNext(last, targetReps);

  return (
    <div className="mx-4 mt-3 rounded-lg bg-white/[0.04] border border-white/5 px-3 py-2 text-xs space-y-1.5">
      <p className="text-brand/50">
        Lần trước ({format(new Date(last.date), 'dd/MM')}):{' '}
        <span className="text-brand/80 font-mono">{last.sets.length} hiệp, tốt nhất {formatSet(top)}</span>
      </p>
      {suggestion && (
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-start gap-1.5 text-accent/90">
            <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{suggestion.reason}</span>
          </p>
          <button
            onClick={() => onApply(suggestion.weight, suggestion.reps)}
            className="shrink-0 px-3 py-1.5 rounded-md bg-accent/20 text-accent font-mono uppercase tracking-wider text-[10px] hover:bg-accent/30 transition-colors"
          >
            Áp dụng
          </button>
        </div>
      )}
    </div>
  );
}
