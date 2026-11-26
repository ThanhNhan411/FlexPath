import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchExercises } from './exerciseService';

const FREE_DB = [
  {
    id: 'Barbell_Squat',
    name: 'Barbell Squat',
    level: 'beginner',
    equipment: 'barbell',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: [],
    instructions: ['Squat down'],
    category: 'strength',
    images: ['Barbell_Squat/0.jpg', 'Barbell_Squat/1.jpg'],
  },
];

const REPDB = {
  exercises: [
    // duplicate of a free-exercise-db entry: must be dropped
    {
      id: 'barbell-squat',
      name_en: 'Barbell Squat',
      difficulty: 'intermediate',
      primary_muscles: ['quadriceps'],
      images: { flat: { start: 'images/flat/a.webp', peak: 'images/flat/b.webp' } },
    },
    // new, fully illustrated exercise
    {
      id: 'archer-push-ups',
      name_en: 'Archer Push Ups',
      difficulty: 'advanced',
      category: 'strength',
      equipment: null,
      force_type: 'push',
      mechanic: 'compound',
      primary_muscles: ['pectoralis_major', 'serratus_anterior'],
      secondary_muscles: ['triceps_brachii'],
      instructions_en: ['Wide push-up position', 'Lower to one side'],
      images: { flat: { start: 'images/flat/archer-start.webp', peak: 'images/flat/archer-peak.webp' } },
    },
    // no images: must be dropped
    { id: 'no-images', name_en: 'Mystery Move', primary_muscles: ['triceps_brachii'], images: {} },
    {
      id: 'cable-fly',
      name_en: 'Cable Fly Machine',
      difficulty: 'beginner',
      equipment: 'chest_fly_machine',
      category: 'olympic',
      primary_muscles: ['hip_flexors'],
      images: { flat: { start: 'images/flat/fly.webp' } },
    },
  ],
};

type Handler = () => Response;

function mockFetch(handlers: { free?: Handler; repdb?: Handler }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('yuhonas')) return handlers.free ? handlers.free() : new Response('error', { status: 500 });
      if (url.includes('sergei-argutin')) return handlers.repdb ? handlers.repdb() : new Response('error', { status: 500 });
      throw new Error('unexpected url ' + url);
    })
  );
}

const json = (data: unknown): Handler => () => new Response(JSON.stringify(data), { status: 200 });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchExercises', () => {
  it('merges both sources, dropping duplicates and exercises without images', async () => {
    mockFetch({ free: json(FREE_DB), repdb: json(REPDB) });
    const all = await fetchExercises();
    const names = all.map(e => e.name);

    expect(names.filter(n => n === 'Barbell Squat')).toHaveLength(1);
    expect(names).toContain('Archer Push Ups');
    expect(names).not.toContain('Mystery Move');
    expect(new Set(all.map(e => e.id)).size).toBe(all.length);
  });

  it('maps RepDB fields to the app vocabulary', async () => {
    mockFetch({ free: json(FREE_DB), repdb: json(REPDB) });
    const archer = (await fetchExercises()).find(e => e.name === 'Archer Push Ups')!;

    expect(archer.id).toBe('repdb-archer-push-ups');
    expect(archer.level).toBe('expert');
    expect(archer.equipment).toBe('body only');
    expect(archer.primaryMuscles).toEqual(['chest']);
    expect(archer.secondaryMuscles).toEqual(['triceps']);
    expect(archer.images).toHaveLength(2);
    expect(archer.images[0]).toBe(
      'https://raw.githubusercontent.com/sergei-argutin/exercise-dataset/main/images/flat/archer-start.webp'
    );
    expect(archer.gifUrl).toBeNull(); // so the two frames animate
  });

  it('maps machines and categories', async () => {
    mockFetch({ free: json(FREE_DB), repdb: json(REPDB) });
    const fly = (await fetchExercises()).find(e => e.name === 'Cable Fly Machine')!;
    expect(fly.equipment).toBe('machine');
    expect(fly.category).toBe('olympic weightlifting');
  });

  it('still returns the other source when one fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch({ repdb: json(REPDB) });
    const onlyRep = await fetchExercises();
    expect(onlyRep.some(e => e.id.startsWith('repdb-'))).toBe(true);

    mockFetch({ free: json(FREE_DB) });
    const onlyFree = await fetchExercises();
    expect(onlyFree.map(e => e.name)).toEqual(['Barbell Squat']);
  });

  it('returns an empty list if both sources fail', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch({});
    expect(await fetchExercises()).toEqual([]);
  });
});
