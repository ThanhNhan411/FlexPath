import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Measurement, METRICS, MetricKey, bmiFor, validateEntry, isValidDateString } from '../lib/bodyMetrics';

const COLLECTION = 'body_measurements';
const MAX_ENTRIES = 500;

/**
 * Loads the user's measurements, newest first. Filtering only on userId avoids needing a composite
 * Firestore index; sorting happens client-side.
 */
export async function fetchMeasurements(): Promise<Measurement[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const snap = await getDocs(query(collection(db, COLLECTION), where('userId', '==', user.uid)));
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<Measurement, 'id'>) }))
    .filter(m => typeof m.date === 'string')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_ENTRIES);
}

export interface NewMeasurement {
  date: string;
  values: Partial<Record<MetricKey, number>>;
  note?: string;
}

export async function addMeasurement(input: NewMeasurement): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  if (!isValidDateString(input.date)) throw new Error('Ngày không hợp lệ');

  const check = validateEntry(input.values);
  if (!check.ok) throw new Error(Object.values(check.errors)[0] || 'Chưa nhập chỉ số nào');

  const data: Record<string, unknown> = {
    userId: user.uid,
    date: input.date,
    createdAt: new Date().toISOString(),
  };
  for (const m of METRICS) {
    const v = input.values[m.key];
    if (typeof v === 'number' && Number.isFinite(v)) data[m.key] = v;
  }
  const note = input.note?.trim();
  if (note) data.note = note.slice(0, 500);

  const ref = await addDoc(collection(db, COLLECTION), data);
  return ref.id;
}

export async function deleteMeasurement(id: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Not authenticated');
  await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * Keeps the health profile (used for BMI and workout personalization) in sync with the newest weight.
 * Does nothing if the user has no profile yet, because a profile needs a height to be meaningful.
 */
export async function syncWeightToProfile(weightKg: number): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const ref = doc(db, 'health_profiles', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const height = snap.data().height;
  const bmi = typeof height === 'number' ? bmiFor(weightKg, height) : null;
  await setDoc(
    ref,
    { weight: weightKg, ...(bmi !== null ? { bmi } : {}), updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return true;
}
