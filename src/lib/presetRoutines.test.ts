import { describe, it, expect } from 'vitest';
import { PRESET_PROGRAMS, resolveSession } from './presetRoutines';
import { Exercise } from '../types';

const fake = (id: string, name: string): Exercise => ({
  id,
  name,
  force: null,
  level: 'beginner',
  mechanic: null,
  equipment: null,
  primaryMuscles: [],
  secondaryMuscles: [],
  instructions: [],
  category: 'strength',
  images: [],
  gifUrl: null,
});

describe('preset programs data', () => {
  it('has unique program ids', () => {
    const ids = PRESET_PROGRAMS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PRESET_PROGRAMS.map(p => [p.id, p] as const))('%s is well formed', (_id, program) => {
    expect(program.sessions.length).toBeGreaterThan(0);
    expect(program.daysPerWeek).toBeGreaterThan(0);
    expect(program.tips.length).toBeGreaterThan(0);
    for (const session of program.sessions) {
      expect(session.exercises.length).toBeGreaterThan(0);
      const names = session.exercises.map(e => e.name);
      expect(new Set(names).size, `duplicate exercise in ${session.name}`).toBe(names.length);
      for (const e of session.exercises) {
        expect(e.sets).toBeGreaterThan(0);
        expect(e.reps).toBeGreaterThan(0);
      }
    }
  });

  it('stays within Firestore rule limits when saved as templates', () => {
    for (const p of PRESET_PROGRAMS) {
      for (const s of p.sessions) {
        expect(`${p.name} – ${s.name}`.length).toBeLessThanOrEqual(100);
        expect(`${p.tagline}. ${s.focus}.`.length).toBeLessThanOrEqual(1000);
        expect(s.exercises.length).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('resolveSession', () => {
  const session = PRESET_PROGRAMS[0].sessions[0];

  it('maps preset names to library exercises ignoring case and punctuation', () => {
    const library = [fake('bs', 'bodyweight squat'), fake('ip', 'INCLINE PUSH UP')];
    const resolved = resolveSession(session, library);
    expect(resolved.map(r => r.exerciseId)).toEqual(['bs', 'ip']);
    expect(resolved[0]).toMatchObject({ exerciseName: 'bodyweight squat', sets: 3, reps: 12 });
  });

  it('skips exercises missing from the library', () => {
    expect(resolveSession(session, [])).toEqual([]);
  });

  it('keeps coaching notes', () => {
    const resolved = resolveSession(session, [fake('ip', 'Incline Push-Up')]);
    expect(resolved[0].notes).toContain('ghế');
  });
});
