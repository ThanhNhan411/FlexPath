/**
 * Pure progressive-overload logic: personal records, per-session stats and next-weight suggestions.
 * No Firebase or React dependencies so it can be unit tested.
 */

export interface SetRecord {
  weight: number;
  reps: number;
}

/** All completed sets of one exercise within one workout. */
export interface ExerciseSession {
  workoutId: string;
  /** ISO date string of the workout start. */
  date: string;
  sets: SetRecord[];
}

export interface SessionStats {
  maxWeight: number;
  maxReps: number;
  /** Best estimated one-rep max in the session (0 for bodyweight-only sessions). */
  bestE1RM: number;
  volume: number;
  /** Best set: heaviest by estimated 1RM, or most reps for bodyweight work. */
  topSet: SetRecord | null;
}

/** Epley estimated one-rep max. Returns 0 for bodyweight sets (weight 0). */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function sessionStats(session: ExerciseSession): SessionStats {
  let maxWeight = 0;
  let maxReps = 0;
  let bestE1RM = 0;
  let volume = 0;
  let topSet: SetRecord | null = null;

  for (const s of session.sets) {
    if (s.reps <= 0) continue;
    maxWeight = Math.max(maxWeight, s.weight);
    maxReps = Math.max(maxReps, s.reps);
    volume += s.weight * s.reps;
    const e1 = estimate1RM(s.weight, s.reps);
    bestE1RM = Math.max(bestE1RM, e1);

    const better =
      !topSet ||
      (s.weight > 0 || topSet.weight > 0
        ? e1 > estimate1RM(topSet.weight, topSet.reps)
        : s.reps > topSet.reps);
    if (better) topSet = s;
  }

  return { maxWeight, maxReps, bestE1RM: round1(bestE1RM), volume, topSet };
}

export interface PersonalRecords {
  maxWeight: { value: number; date: string } | null;
  bestE1RM: { value: number; date: string } | null;
  maxReps: { value: number; date: string } | null;
  maxVolume: { value: number; date: string } | null;
}

/** Sessions must be sorted ascending by date. Ties keep the earliest achievement. */
export function personalRecords(sessions: ExerciseSession[]): PersonalRecords {
  const pr: PersonalRecords = { maxWeight: null, bestE1RM: null, maxReps: null, maxVolume: null };
  for (const session of sessions) {
    const st = sessionStats(session);
    if (st.maxWeight > 0 && (!pr.maxWeight || st.maxWeight > pr.maxWeight.value)) pr.maxWeight = { value: st.maxWeight, date: session.date };
    if (st.bestE1RM > 0 && (!pr.bestE1RM || st.bestE1RM > pr.bestE1RM.value)) pr.bestE1RM = { value: st.bestE1RM, date: session.date };
    if (st.maxReps > 0 && (!pr.maxReps || st.maxReps > pr.maxReps.value)) pr.maxReps = { value: st.maxReps, date: session.date };
    if (st.volume > 0 && (!pr.maxVolume || st.volume > pr.maxVolume.value)) pr.maxVolume = { value: st.volume, date: session.date };
  }
  return pr;
}

/**
 * Does this set beat everything done before? Weighted sets compare estimated 1RM,
 * bodyweight sets compare reps. A first-ever set is not reported as a PR.
 */
export function isSetPR(previous: ExerciseSession[], set: SetRecord): boolean {
  if (set.reps <= 0 || previous.length === 0) return false;
  let bestE1 = 0;
  let bestReps = 0;
  let hadWeighted = false;
  for (const session of previous) {
    for (const s of session.sets) {
      if (s.reps <= 0) continue;
      if (s.weight > 0) hadWeighted = true;
      bestE1 = Math.max(bestE1, estimate1RM(s.weight, s.reps));
      if (s.weight === 0) bestReps = Math.max(bestReps, s.reps);
    }
  }
  if (set.weight > 0) {
    if (!hadWeighted) return false;
    return estimate1RM(set.weight, set.reps) > bestE1 + 0.01;
  }
  return bestReps > 0 && set.reps > bestReps && !hadWeighted;
}

export interface Suggestion {
  weight: number;
  reps: number;
  reason: string;
}

/** Smallest sensible plate jump for the current load. */
export function weightIncrement(weight: number): number {
  if (weight < 20) return 1;
  if (weight < 60) return 2.5;
  return 5;
}

/**
 * Double-progression suggestion based on the most recent session:
 * - hit the target reps on every working set -> add a small weight jump (or +1 rep for bodyweight)
 * - otherwise -> keep the weight and aim for the target reps.
 */
export function suggestNext(last: ExerciseSession | undefined, targetReps: number): Suggestion | null {
  if (!last) return null;
  const sets = last.sets.filter(s => s.reps > 0);
  if (sets.length === 0) return null;

  const topWeight = Math.max(...sets.map(s => s.weight));

  if (topWeight === 0) {
    const bestReps = Math.max(...sets.map(s => s.reps));
    const allHit = sets.every(s => s.reps >= Math.max(targetReps, 1));
    return allHit
      ? { weight: 0, reps: bestReps + 1, reason: `Đã đạt đủ ${targetReps} rep, thử ${bestReps + 1} rep mỗi hiệp` }
      : { weight: 0, reps: targetReps, reason: `Cố gắng đạt đủ ${targetReps} rep mỗi hiệp` };
  }

  const working = sets.filter(s => s.weight === topWeight);
  const allHit = working.length > 0 && working.every(s => s.reps >= targetReps);

  if (allHit) {
    const next = round1(topWeight + weightIncrement(topWeight));
    return { weight: next, reps: targetReps, reason: `Đã đạt đủ ${targetReps} rep ở ${topWeight} kg, tăng lên ${next} kg` };
  }
  return { weight: topWeight, reps: targetReps, reason: `Giữ ${topWeight} kg và cố gắng đạt đủ ${targetReps} rep` };
}

export function formatSet(s: SetRecord | null): string {
  if (!s) return '–';
  return s.weight > 0 ? `${s.weight} kg × ${s.reps}` : `${s.reps} rep`;
}
