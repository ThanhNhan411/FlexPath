/**
 * Daily energy and macro targets from body metrics. General guidance only, not medical advice.
 * Pure functions so everything is unit testable.
 */

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type NutritionGoal = 'lose' | 'maintain' | 'gain';
export type BmiBand = 'underweight' | 'normal' | 'overweight' | 'obese';

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export const ACTIVITY_LABEL: Record<ActivityLevel, { label: string; hint: string }> = {
  sedentary: { label: 'Ít vận động', hint: 'Làm việc văn phòng, hầu như không tập' },
  light: { label: 'Nhẹ', hint: 'Tập 1–2 buổi mỗi tuần' },
  moderate: { label: 'Vừa', hint: 'Tập 3–4 buổi mỗi tuần' },
  active: { label: 'Nhiều', hint: 'Tập 5–6 buổi mỗi tuần' },
  athlete: { label: 'Rất nhiều', hint: 'Tập hằng ngày hoặc công việc nặng' },
};

export const GOAL_LABEL: Record<NutritionGoal, string> = {
  lose: 'Giảm mỡ',
  maintain: 'Duy trì',
  gain: 'Tăng cơ',
};

export interface NutritionInput {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: NutritionGoal;
}

export interface MacroTargets {
  proteinG: number;
  fatG: number;
  carbG: number;
  proteinPct: number;
  fatPct: number;
  carbPct: number;
}

export interface NutritionPlan {
  bmi: number;
  bmiBand: BmiBand;
  bmr: number;
  tdee: number;
  targetKcal: number;
  /** targetKcal - tdee */
  deltaKcal: number;
  macros: MacroTargets;
  waterMl: number;
  fiberG: number;
  /** Expected body weight change per week at this target (negative = loss). */
  weeklyChangeKg: number;
  healthyWeightKg: { min: number; max: number };
  /** Goal actually applied (can differ from the requested one for safety). */
  appliedGoal: NutritionGoal;
  warnings: string[];
}

const KCAL_PER_KG = 7700;
const MIN_KCAL: Record<Gender, number> = { female: 1200, male: 1500 };

export const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function bmiBand(bmi: number): BmiBand {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export function defaultGoal(bmi: number): NutritionGoal {
  const band = bmiBand(bmi);
  return band === 'underweight' ? 'gain' : band === 'normal' ? 'maintain' : 'lose';
}

/** Reasonable starting activity level from how many workouts per week the user aims for. */
export function activityFromWeeklyGoal(sessionsPerWeek: number): ActivityLevel {
  if (sessionsPerWeek <= 0) return 'sedentary';
  if (sessionsPerWeek <= 2) return 'light';
  if (sessionsPerWeek <= 4) return 'moderate';
  return 'active';
}

export function isValidInput(i: Pick<NutritionInput, 'age' | 'heightCm' | 'weightKg'>): boolean {
  return i.age >= 10 && i.age <= 100 && i.heightCm >= 100 && i.heightCm <= 250 && i.weightKg >= 25 && i.weightKg <= 300;
}

/** Mifflin-St Jeor basal metabolic rate. */
export function bmrMifflin(gender: Gender, age: number, heightCm: number, weightKg: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);
}

export function healthyWeightRange(heightCm: number): { min: number; max: number } {
  const m = heightCm / 100;
  return { min: Math.round(18.5 * m * m * 10) / 10, max: Math.round(24.9 * m * m * 10) / 10 };
}

/**
 * Weight used for protein targets. For obesity, protein per actual kg overshoots, so use the healthy
 * upper weight plus a quarter of the excess (adjusted body weight).
 */
export function proteinReferenceWeight(weightKg: number, heightCm: number): number {
  const upper = 25 * (heightCm / 100) ** 2;
  const bmi = weightKg / (heightCm / 100) ** 2;
  return bmi >= 30 ? upper + 0.25 * (weightKg - upper) : weightKg;
}

const PROTEIN_PER_KG: Record<NutritionGoal, number> = { lose: 2.0, maintain: 1.6, gain: 1.8 };

export function calculatePlan(input: NutritionInput): NutritionPlan | null {
  if (!isValidInput(input)) return null;
  const { gender, age, heightCm, weightKg, activity } = input;
  const warnings: string[] = [];

  const bmi = Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
  const band = bmiBand(bmi);
  const bmr = Math.round(bmrMifflin(gender, age, heightCm, weightKg));
  // Rounded to 10 kcal so a maintenance target equals TDEE exactly.
  const tdee = roundTo(bmr * ACTIVITY_FACTOR[activity], 10);

  let goal = input.goal;
  if (age < 18 && goal === 'lose') {
    goal = 'maintain';
    warnings.push('Dưới 18 tuổi không nên áp dụng chế độ giảm calo. Kế hoạch được đặt ở mức duy trì, hãy hỏi bác sĩ hoặc chuyên gia dinh dưỡng.');
  }
  if (goal === 'lose' && band === 'underweight') {
    goal = 'maintain';
    warnings.push('BMI của bạn đang thấp, không nên giảm cân. Kế hoạch được đặt ở mức duy trì.');
  }
  if (goal === 'gain' && band === 'obese') {
    warnings.push('BMI của bạn đang ở mức béo phì, tăng calo có thể không phù hợp. Cân nhắc mục tiêu duy trì hoặc giảm mỡ.');
  }

  let target = tdee;
  if (goal === 'lose') {
    const deficit = Math.min(tdee * 0.2, 1000);
    target = tdee - deficit;
    const floor = MIN_KCAL[gender];
    if (target < floor) {
      target = Math.min(tdee, floor);
      warnings.push(`Mức calo giảm mỡ được giữ tối thiểu ${floor} kcal để đảm bảo đủ dinh dưỡng.`);
    }
  } else if (goal === 'gain') {
    target = tdee + Math.min(Math.max(tdee * 0.1, 250), 500);
  }
  target = roundTo(target, 10);

  // Macros
  const refWeight = proteinReferenceWeight(weightKg, heightCm);
  let proteinG = Math.round(refWeight * PROTEIN_PER_KG[goal]);
  proteinG = Math.min(proteinG, Math.round((target * 0.35) / 4)); // never above 35% of calories

  // Fat: 25% of calories, but at least ~0.6 g/kg for hormone health (capped at 40% of calories).
  const fatG = Math.round(Math.max((target * 0.25) / 9, Math.min(weightKg * 0.6, (target * 0.4) / 9)));
  let carbG = Math.round((target - proteinG * 4 - fatG * 9) / 4);
  if (carbG < 0) carbG = 0;

  const kcalP = proteinG * 4;
  const kcalF = fatG * 9;
  const kcalC = carbG * 4;
  const total = kcalP + kcalF + kcalC || 1;
  const pct = (v: number) => Math.round((v / total) * 100);

  const actualDelta = target - tdee;
  const weeklyChangeKg = Math.round(((actualDelta * 7) / KCAL_PER_KG) * 100) / 100;

  if (-weeklyChangeKg > 0.01 * weightKg) {
    warnings.push('Tốc độ giảm cân dự kiến khá nhanh, hãy theo dõi cơ thể và nghỉ ngơi đầy đủ.');
  }

  return {
    bmi,
    bmiBand: band,
    bmr,
    tdee,
    targetKcal: target,
    deltaKcal: actualDelta,
    macros: { proteinG, fatG, carbG, proteinPct: pct(kcalP), fatPct: pct(kcalF), carbPct: pct(kcalC) },
    waterMl: roundTo(weightKg * 35, 50),
    fiberG: Math.round((target / 1000) * 14),
    weeklyChangeKg,
    healthyWeightKg: healthyWeightRange(heightCm),
    appliedGoal: goal,
    warnings,
  };
}

export interface MealSplit {
  name: string;
  share: number;
  kcal: number;
  proteinG: number;
}

export const MEAL_SHARES: { name: string; share: number }[] = [
  { name: 'Bữa sáng', share: 0.25 },
  { name: 'Bữa trưa', share: 0.35 },
  { name: 'Bữa tối', share: 0.3 },
  { name: 'Bữa phụ', share: 0.1 },
];

export function splitMeals(plan: Pick<NutritionPlan, 'targetKcal' | 'macros'>): MealSplit[] {
  return MEAL_SHARES.map(m => ({
    name: m.name,
    share: m.share,
    kcal: roundTo(plan.targetKcal * m.share, 10),
    proteinG: Math.round(plan.macros.proteinG * m.share),
  }));
}

export interface ProteinFood {
  name: string;
  proteinPer100g: number;
  kcalPer100g: number;
}

/** Approximate values for common foods (cooked unless noted), for rough planning only. */
export const PROTEIN_FOODS: ProteinFood[] = [
  { name: 'Ức gà (nấu chín)', proteinPer100g: 31, kcalPer100g: 165 },
  { name: 'Tôm (nấu chín)', proteinPer100g: 24, kcalPer100g: 99 },
  { name: 'Cá hồi (sống)', proteinPer100g: 20, kcalPer100g: 208 },
  { name: 'Thịt bò nạc (nấu chín)', proteinPer100g: 26, kcalPer100g: 217 },
  { name: 'Trứng gà', proteinPer100g: 13, kcalPer100g: 143 },
  { name: 'Sữa chua Hy Lạp', proteinPer100g: 10, kcalPer100g: 59 },
  { name: 'Đậu lăng (nấu chín)', proteinPer100g: 9, kcalPer100g: 116 },
  { name: 'Đậu hũ (sống)', proteinPer100g: 8, kcalPer100g: 76 },
];

/** Grams of a food needed to cover `proteinG`. */
export function gramsForProtein(food: ProteinFood, proteinG: number): number {
  return Math.round(roundTo((proteinG / food.proteinPer100g) * 100, 5));
}
