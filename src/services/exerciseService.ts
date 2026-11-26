import { Exercise } from '../types';

// Source 1: free-exercise-db (public domain)
const DATA_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const BASE_IMAGE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

// Source 2: RepDB free tier (https://repdb.co) — in-app use with visible attribution
// ("Exercise data by RepDB"). Loaded at runtime and never copied into this repo,
// because its license forbids redistributing the dataset.
const REPDB_DATA_URL = 'https://raw.githubusercontent.com/sergei-argutin/exercise-dataset/main/exercises.json';
const REPDB_IMAGE_URL = 'https://raw.githubusercontent.com/sergei-argutin/exercise-dataset/main/';

export const REPDB_ATTRIBUTION = { label: 'Exercise data by RepDB (repdb.co)', url: 'https://repdb.co' };

const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function fetchFreeExerciseDb(): Promise<Exercise[]> {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Failed to fetch dataset: ${response.statusText}`);
  const data = await response.json();

  return data.map((ex: any) => {
    const id = ex.id || (ex.name ? ex.name.toLowerCase().replace(/\s+/g, '-') : Math.random().toString(36).substr(2, 9));

    const images = Array.isArray(ex.images)
      ? ex.images.map((img: string) => (img.startsWith('http') ? img : `${BASE_IMAGE_URL}${img}`))
      : [];

    return {
      id,
      name: ex.name || 'Unknown Exercise',
      force: ex.force || null,
      level: ex.level || 'beginner',
      mechanic: ex.mechanic || null,
      equipment: ex.equipment || 'No equipment',
      primaryMuscles: Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : (ex.primary_muscles ? (Array.isArray(ex.primary_muscles) ? ex.primary_muscles : [ex.primary_muscles]) : []),
      secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : (ex.secondary_muscles ? (Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles : [ex.secondary_muscles]) : []),
      instructions: Array.isArray(ex.instructions)
        ? ex.instructions
        : (typeof ex.instructions === 'string' ? ex.instructions.split('\n').filter(Boolean) : []),
      category: ex.category || 'strength',
      images,
      gifUrl: ex.gifUrl ? (ex.gifUrl.startsWith('http') ? ex.gifUrl : `${BASE_IMAGE_URL}${ex.gifUrl}`) : (images.length > 0 ? images[0] : null),
    };
  });
}

// RepDB vocabulary -> the vocabulary already used by free-exercise-db, so filters stay unified.
const REPDB_MUSCLE_MAP: Record<string, string> = {
  abductors: 'abductors',
  adductors: 'adductors',
  anterior_deltoid: 'shoulders',
  lateral_deltoid: 'shoulders',
  posterior_deltoid: 'shoulders',
  biceps_brachii: 'biceps',
  brachialis: 'biceps',
  brachioradialis: 'forearms',
  forearm_extensors: 'forearms',
  forearm_flexors: 'forearms',
  erector_spinae: 'lower back',
  quadratus_lumborum: 'lower back',
  gastrocnemius: 'calves',
  soleus: 'calves',
  tibialis_anterior: 'calves',
  gluteus_maximus: 'glutes',
  gluteus_medius: 'glutes',
  hamstrings: 'hamstrings',
  hip_flexors: 'quadriceps',
  quadriceps: 'quadriceps',
  infraspinatus_teres_minor: 'shoulders',
  latissimus_dorsi: 'lats',
  rhomboids: 'middle back',
  trapezius: 'traps',
  obliques: 'abdominals',
  rectus_abdominis: 'abdominals',
  transverse_abdominis: 'abdominals',
  pectoralis_major: 'chest',
  serratus_anterior: 'chest',
  triceps_brachii: 'triceps',
};

const REPDB_EQUIPMENT_MAP: Record<string, string> = {
  barbell: 'barbell',
  trap_bar: 'barbell',
  smith_machine: 'machine',
  dumbbell: 'dumbbell',
  kettlebell: 'kettlebells',
  cable: 'cable',
  ez_bar: 'e-z curl bar',
  resistance_band: 'bands',
  loop_band: 'bands',
  medicine_ball: 'medicine ball',
  slam_ball: 'medicine ball',
  wall_ball: 'medicine ball',
  stability_ball: 'exercise ball',
  bosu_ball: 'exercise ball',
};

function mapMuscles(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.map((m: string) => REPDB_MUSCLE_MAP[m] ?? m.replace(/_/g, ' '))));
}

function mapEquipment(eq: unknown): string {
  if (!eq || typeof eq !== 'string') return 'body only';
  if (REPDB_EQUIPMENT_MAP[eq]) return REPDB_EQUIPMENT_MAP[eq];
  return eq.endsWith('machine') || ['leg_curl', 'leg_extension', 'leg_press', 'hack_squat', 'pec_deck', 'glute_ham_developer'].includes(eq)
    ? 'machine'
    : 'other';
}

const REPDB_CATEGORY_MAP: Record<string, string> = {
  olympic: 'olympic weightlifting',
};

async function fetchRepDb(): Promise<Exercise[]> {
  const response = await fetch(REPDB_DATA_URL);
  if (!response.ok) throw new Error(`Failed to fetch RepDB dataset: ${response.statusText}`);
  const data = await response.json();
  const list: any[] = Array.isArray(data?.exercises) ? data.exercises : [];

  return list
    .map((ex): Exercise | null => {
      const flat = ex.images?.flat || {};
      const images: string[] = [flat.start, flat.peak].filter(Boolean).map((p: string) => `${REPDB_IMAGE_URL}${p}`);
      if (!ex.id || !ex.name_en || images.length === 0) return null; // only fully illustrated exercises

      const steps = Array.isArray(ex.instructions_en)
        ? ex.instructions_en
        : (typeof ex.instructions_en === 'string' ? ex.instructions_en.split('\n').filter(Boolean) : []);

      return {
        id: `repdb-${ex.id}`,
        name: ex.name_en,
        force: ex.force_type || null,
        level: ex.difficulty === 'advanced' ? 'expert' : (ex.difficulty || 'beginner'),
        mechanic: ex.mechanic || null,
        equipment: mapEquipment(ex.equipment),
        primaryMuscles: mapMuscles(ex.primary_muscles),
        secondaryMuscles: mapMuscles(ex.secondary_muscles),
        instructions: steps,
        category: REPDB_CATEGORY_MAP[ex.category] ?? ex.category ?? 'strength',
        images,
        gifUrl: null,
      };
    })
    .filter((e): e is Exercise => e !== null);
}

export async function fetchExercises(): Promise<Exercise[]> {
  const [primary, extra] = await Promise.allSettled([fetchFreeExerciseDb(), fetchRepDb()]);

  if (primary.status === 'rejected') console.error('Error fetching free-exercise-db:', primary.reason);
  if (extra.status === 'rejected') console.error('Error fetching RepDB:', extra.reason);

  const base = primary.status === 'fulfilled' ? primary.value : [];
  const seen = new Set(base.map(e => normalizeName(e.name)));

  // Skip RepDB entries that duplicate an exercise we already have.
  const additions = (extra.status === 'fulfilled' ? extra.value : []).filter(e => {
    const key = normalizeName(e.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return [...base, ...additions];
}
