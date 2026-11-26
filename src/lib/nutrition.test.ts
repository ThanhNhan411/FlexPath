import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_FACTOR,
  NutritionInput,
  activityFromWeeklyGoal,
  bmiBand,
  bmrMifflin,
  calculatePlan,
  defaultGoal,
  gramsForProtein,
  healthyWeightRange,
  isValidInput,
  proteinReferenceWeight,
  splitMeals,
  PROTEIN_FOODS,
} from './nutrition';

const man: NutritionInput = { gender: 'male', age: 30, heightCm: 175, weightKg: 75, activity: 'moderate', goal: 'maintain' };
const woman: NutritionInput = { gender: 'female', age: 28, heightCm: 163, weightKg: 58, activity: 'light', goal: 'maintain' };

describe('bmrMifflin', () => {
  it('matches the published formula', () => {
    // 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5
    expect(bmrMifflin('male', 30, 175, 75)).toBeCloseTo(1698.75, 2);
    // 10*58 + 6.25*163 - 5*28 - 161
    expect(bmrMifflin('female', 28, 163, 58)).toBeCloseTo(1297.75, 2);
  });
});

describe('bands and defaults', () => {
  it.each([
    [17, 'underweight', 'gain'],
    [22, 'normal', 'maintain'],
    [27, 'overweight', 'lose'],
    [33, 'obese', 'lose'],
  ] as const)('BMI %s is %s and defaults to %s', (bmi, band, goal) => {
    expect(bmiBand(bmi)).toBe(band);
    expect(defaultGoal(bmi)).toBe(goal);
  });

  it.each([
    [0, 'sedentary'],
    [1, 'light'],
    [2, 'light'],
    [3, 'moderate'],
    [4, 'moderate'],
    [5, 'active'],
    [7, 'active'],
  ] as const)('%s workouts/week -> %s', (n, level) => expect(activityFromWeeklyGoal(n)).toBe(level));
});

describe('input validation', () => {
  it('accepts normal values and rejects absurd ones', () => {
    expect(isValidInput(man)).toBe(true);
    expect(isValidInput({ ...man, age: 5 })).toBe(false);
    expect(isValidInput({ ...man, heightCm: 80 })).toBe(false);
    expect(isValidInput({ ...man, weightKg: 10 })).toBe(false);
    expect(calculatePlan({ ...man, weightKg: NaN })).toBeNull();
  });
});

describe('calculatePlan - maintenance', () => {
  const plan = calculatePlan(man)!;

  it('TDEE is BMR times the activity factor', () => {
    expect(plan.bmr).toBe(1699);
    expect(plan.tdee).toBe(Math.round((1699 * ACTIVITY_FACTOR.moderate) / 10) * 10);
    expect(plan.targetKcal).toBe(plan.tdee);
    expect(plan.weeklyChangeKg).toBeCloseTo(0, 1);
  });

  it('macros add up to the calorie target', () => {
    const { proteinG, fatG, carbG } = plan.macros;
    const kcal = proteinG * 4 + fatG * 9 + carbG * 4;
    expect(Math.abs(kcal - plan.targetKcal)).toBeLessThan(15);
    expect(plan.macros.proteinPct + plan.macros.fatPct + plan.macros.carbPct).toBeGreaterThanOrEqual(99);
    expect(plan.macros.proteinPct + plan.macros.fatPct + plan.macros.carbPct).toBeLessThanOrEqual(101);
  });

  it('uses about 1.6 g protein per kg when maintaining', () => {
    expect(plan.macros.proteinG).toBe(Math.round(75 * 1.6));
  });

  it('computes water, fibre and the healthy weight range', () => {
    expect(plan.waterMl).toBe(2650); // 75 * 35 = 2625 -> nearest 50
    expect(plan.fiberG).toBe(Math.round((plan.targetKcal / 1000) * 14));
    expect(plan.healthyWeightKg).toEqual(healthyWeightRange(175));
    expect(plan.healthyWeightKg.min).toBeCloseTo(56.7, 1);
    expect(plan.healthyWeightKg.max).toBeCloseTo(76.3, 1);
  });

  it('has no warnings for a healthy adult', () => {
    expect(plan.warnings).toEqual([]);
  });
});

describe('calculatePlan - goals', () => {
  it('cuts about 20% for fat loss and raises protein', () => {
    const maintain = calculatePlan(man)!;
    const lose = calculatePlan({ ...man, goal: 'lose' })!;
    expect(lose.deltaKcal).toBeLessThan(0);
    expect(lose.targetKcal).toBeCloseTo(maintain.tdee * 0.8, -1);
    expect(lose.macros.proteinG).toBeGreaterThan(maintain.macros.proteinG);
    expect(lose.weeklyChangeKg).toBeLessThan(0);
  });

  it('adds a modest surplus for gaining, between 250 and 500 kcal', () => {
    const gain = calculatePlan({ ...man, goal: 'gain' })!;
    expect(gain.deltaKcal).toBeGreaterThanOrEqual(250);
    expect(gain.deltaKcal).toBeLessThanOrEqual(500);
    expect(gain.weeklyChangeKg).toBeGreaterThan(0);
  });

  it('never goes under the safe calorie floor when cutting', () => {
    const small = calculatePlan({ ...woman, weightKg: 42, heightCm: 150, activity: 'sedentary', goal: 'lose' })!;
    expect(small.targetKcal).toBeGreaterThanOrEqual(1200 - 10);
    const floorHit = calculatePlan({ ...woman, age: 60, weightKg: 40, heightCm: 148, activity: 'sedentary', goal: 'lose' })!;
    expect(floorHit.targetKcal).toBeLessThanOrEqual(floorHit.tdee + 5); // never above maintenance (allowing rounding)
  });

  it('refuses a deficit for minors', () => {
    const teen = calculatePlan({ ...man, age: 16, goal: 'lose' })!;
    expect(teen.appliedGoal).toBe('maintain');
    expect(teen.deltaKcal).toBe(0);
    expect(teen.warnings.join(' ')).toContain('18');
  });

  it('refuses to cut calories for an underweight BMI', () => {
    const thin = calculatePlan({ ...man, weightKg: 50, goal: 'lose' })!;
    expect(thin.bmiBand).toBe('underweight');
    expect(thin.appliedGoal).toBe('maintain');
    expect(thin.warnings.length).toBeGreaterThan(0);
  });

  it('warns when gaining with an obese BMI', () => {
    const plan = calculatePlan({ ...man, weightKg: 110, goal: 'gain' })!;
    expect(plan.bmiBand).toBe('obese');
    expect(plan.warnings.join(' ')).toContain('béo phì');
  });
});

describe('protein reference weight', () => {
  it('uses actual weight below obesity', () => {
    expect(proteinReferenceWeight(75, 175)).toBe(75);
  });

  it('uses adjusted weight for obesity, so protein does not explode', () => {
    const ref = proteinReferenceWeight(120, 175);
    expect(ref).toBeLessThan(120);
    expect(ref).toBeGreaterThan(25 * 1.75 * 1.75);
    const plan = calculatePlan({ ...man, weightKg: 120, goal: 'lose' })!;
    expect(plan.macros.proteinG).toBeLessThan(Math.round(120 * 2));
  });

  it('caps protein at 35% of calories', () => {
    const plan = calculatePlan({ ...woman, weightKg: 45, heightCm: 168, activity: 'sedentary', goal: 'lose' })!;
    expect(plan.macros.proteinPct).toBeLessThanOrEqual(36);
  });
});

describe('splitMeals', () => {
  it('splits calories and protein across meals', () => {
    const plan = calculatePlan(man)!;
    const meals = splitMeals(plan);
    expect(meals.map(m => m.name)).toEqual(['Bữa sáng', 'Bữa trưa', 'Bữa tối', 'Bữa phụ']);
    expect(meals.reduce((a, m) => a + m.share, 0)).toBeCloseTo(1, 5);
    expect(Math.abs(meals.reduce((a, m) => a + m.kcal, 0) - plan.targetKcal)).toBeLessThanOrEqual(20);
    expect(Math.abs(meals.reduce((a, m) => a + m.proteinG, 0) - plan.macros.proteinG)).toBeLessThanOrEqual(2);
  });
});

describe('gramsForProtein', () => {
  it('converts a protein target into food weight in 5 g steps', () => {
    const chicken = PROTEIN_FOODS.find(f => f.name.includes('Ức gà'))!;
    expect(gramsForProtein(chicken, 31)).toBe(100);
    expect(gramsForProtein(chicken, 40) % 5).toBe(0);
  });

  it('lists foods with sane nutrition values', () => {
    PROTEIN_FOODS.forEach(f => {
      expect(f.proteinPer100g).toBeGreaterThan(0);
      expect(f.proteinPer100g).toBeLessThan(50);
      expect(f.kcalPer100g).toBeGreaterThan(f.proteinPer100g * 3); // protein alone gives 4 kcal/g
    });
  });
});
