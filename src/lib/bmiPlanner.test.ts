import { describe, it, expect } from 'vitest';
import { getBmiCategory, computeBmi, buildBmiPlan, sortByRecommendation, adaptSession, BmiCategory } from './bmiPlanner';
import { PRESET_PROGRAMS, PresetSession } from './presetRoutines';

describe('getBmiCategory', () => {
  it.each([
    [15, 'underweight'],
    [18.49, 'underweight'],
    [18.5, 'normal'],
    [24.99, 'normal'],
    [25, 'overweight'],
    [29.99, 'overweight'],
    [30, 'obese'],
    [42, 'obese'],
  ] as [number, BmiCategory][])('BMI %s is %s', (bmi, cat) => expect(getBmiCategory(bmi)).toBe(cat));
});

describe('computeBmi', () => {
  it('computes weight / height squared', () => expect(computeBmi(175, 70)).toBeCloseTo(22.86, 2));
  it('rejects invalid input', () => {
    expect(computeBmi(0, 70)).toBeNull();
    expect(computeBmi(175, 0)).toBeNull();
    expect(computeBmi(-1, 70)).toBeNull();
  });
});

describe('buildBmiPlan', () => {
  const categories: BmiCategory[] = ['underweight', 'normal', 'overweight', 'obese'];
  const bmiFor: Record<BmiCategory, number> = { underweight: 17, normal: 22, overweight: 27, obese: 33 };

  it.each(categories)('%s plan has advice and valid recommended programs', cat => {
    const plan = buildBmiPlan(bmiFor[cat]);
    expect(plan.category).toBe(cat);
    expect(plan.guidelines.length).toBeGreaterThan(0);
    const ids = new Set(PRESET_PROGRAMS.map(p => p.id));
    plan.recommended.forEach(id => expect(ids.has(id)).toBe(true));
  });
});

describe('sortByRecommendation', () => {
  it('puts recommended programs first, in plan order', () => {
    const plan = buildBmiPlan(33);
    const sorted = sortByRecommendation(PRESET_PROGRAMS, plan);
    expect(sorted.slice(0, plan.recommended.length).map(p => p.id)).toEqual(plan.recommended);
    expect(sorted).toHaveLength(PRESET_PROGRAMS.length);
  });
  it('keeps the original order without a plan', () => {
    expect(sortByRecommendation(PRESET_PROGRAMS, null)).toEqual(PRESET_PROGRAMS);
  });
});

describe('adaptSession', () => {
  const circuit = PRESET_PROGRAMS.find(p => p.id === 'fatloss-circuit')!.sessions[0];
  const names = (s: PresetSession) => s.exercises.map(e => e.name);

  it('leaves sessions untouched for a normal BMI', () => {
    const { session, changes } = adaptSession(circuit, 'normal');
    expect(names(session)).toEqual(names(circuit));
    expect(changes).toEqual([]);
  });

  it('swaps jumping moves for low-impact ones when overweight', () => {
    const { session, changes } = adaptSession(circuit, 'overweight');
    expect(names(session)).not.toContain('Freehand Jump Squat');
    expect(names(session)).toContain('Chair Squat');
    expect(changes.some(c => c.includes('Freehand Jump Squat'))).toBe(true);
  });

  it('never introduces duplicate exercises', () => {
    for (const program of PRESET_PROGRAMS) {
      for (const session of program.sessions) {
        for (const cat of ['underweight', 'normal', 'overweight', 'obese'] as BmiCategory[]) {
          const n = names(adaptSession(session, cat).session);
          expect(new Set(n).size, `${program.id} / ${session.name} / ${cat}`).toBe(n.length);
        }
      }
    }
  });

  it('reduces heavy volume for obese users and swaps hard-to-scale moves', () => {
    const strength = PRESET_PROGRAMS.find(p => p.id === 'strength-barbell')!.sessions[1];
    const { session } = adaptSession(strength, 'obese');
    expect(names(session)).toContain('Wide-Grip Lat Pulldown'); // replaces Pullups
    const original = strength.exercises.find(e => e.name === 'Barbell Bench Press - Medium Grip')!;
    const adapted = session.exercises.find(e => e.name === 'Barbell Bench Press - Medium Grip')!;
    expect(adapted.sets).toBe(original.sets - 1);
  });

  it('adds a rest note to the first exercise for underweight users', () => {
    const { session } = adaptSession(circuit, 'underweight');
    expect(session.exercises[0].notes).toContain('90–120');
  });

  it('does not mutate the original session', () => {
    const before = JSON.stringify(circuit);
    adaptSession(circuit, 'obese');
    expect(JSON.stringify(circuit)).toBe(before);
  });
});
