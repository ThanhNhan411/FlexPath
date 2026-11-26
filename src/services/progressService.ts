import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ExerciseSession } from '../lib/progression';

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  /** Sorted ascending by date. */
  sessions: ExerciseSession[];
}

export type HistoryMap = Map<string, ExerciseHistory>;

const MAX_WORKOUTS = 60;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { uid: string; at: number; data: HistoryMap } | null = null;

/** Call after saving or deleting a workout so the next read is fresh. */
export function invalidateProgressCache() {
  cache = null;
}

/**
 * Loads completed sets per exercise from the user's most recent workouts.
 * Only the latest MAX_WORKOUTS are read to keep Firestore reads bounded.
 */
export async function loadExerciseHistory(force = false): Promise<HistoryMap> {
  const user = auth.currentUser;
  if (!user) return new Map();

  if (!force && cache && cache.uid === user.uid && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  const workoutsSnap = await getDocs(
    query(collection(db, 'workouts'), where('userId', '==', user.uid), orderBy('startTime', 'desc'), limit(MAX_WORKOUTS))
  );

  const workouts = workoutsSnap.docs
    .map(d => ({ id: d.id, ...(d.data() as { status?: string; startTime?: string }) }))
    .filter(w => w.status === 'completed' && w.startTime);

  const logsPerWorkout = await Promise.all(
    workouts.map(async w => {
      try {
        const snap = await getDocs(collection(db, `workouts/${w.id}/logs`));
        return { workout: w, logs: snap.docs.map(d => d.data() as any) };
      } catch (e) {
        console.error('Error loading logs for workout', w.id, e);
        return { workout: w, logs: [] as any[] };
      }
    })
  );

  const map: HistoryMap = new Map();
  for (const { workout, logs } of logsPerWorkout) {
    for (const log of logs) {
      if (!log.exerciseId || !Array.isArray(log.sets)) continue;
      const sets = log.sets
        .filter((s: any) => s && s.completed !== false && Number(s.reps) > 0)
        .map((s: any) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }));
      if (sets.length === 0) continue;

      let entry = map.get(log.exerciseId);
      if (!entry) {
        entry = { exerciseId: log.exerciseId, exerciseName: log.exerciseName || log.exerciseId, sessions: [] };
        map.set(log.exerciseId, entry);
      }
      entry.sessions.push({ workoutId: workout.id, date: workout.startTime!, sets });
    }
  }

  for (const entry of map.values()) {
    entry.sessions.sort((a, b) => a.date.localeCompare(b.date));
  }

  cache = { uid: user.uid, at: Date.now(), data: map };
  return map;
}
