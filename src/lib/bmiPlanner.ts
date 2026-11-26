import { PresetProgram, PresetSession, PresetExercise, PRESET_PROGRAMS } from './presetRoutines';

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface BmiPlan {
  bmi: number;
  category: BmiCategory;
  title: string;
  summary: string;
  guidelines: string[];
  /** Program ids in recommended order. */
  recommended: string[];
}

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export function computeBmi(heightCm: number, weightKg: number): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  return weightKg / (heightCm / 100) ** 2;
}

const PLANS: Record<BmiCategory, Omit<BmiPlan, 'bmi' | 'category'>> = {
  underweight: {
    title: 'Ưu tiên tăng cơ và tăng cân lành mạnh',
    summary:
      'BMI thấp hơn mức bình thường. Giáo án tập trung vào các bài kháng lực compound để xây dựng khối lượng cơ, hạn chế cardio cường độ cao.',
    guidelines: [
      'Ăn dư khoảng 300–500 kcal mỗi ngày, ưu tiên protein (1,6–2 g/kg cân nặng).',
      'Nghỉ dài hơn giữa các hiệp (90–120 giây) để tập được mức tạ tốt hơn.',
      'Giữ cardio nhẹ, tối đa 1–2 buổi mỗi tuần.',
      'Ngủ đủ 7–9 tiếng để cơ phục hồi.',
    ],
    recommended: ['gym-fullbody-beginner', 'dumbbell-home-intermediate', 'ppl-intermediate', 'home-bodyweight-beginner'],
  },
  normal: {
    title: 'Duy trì thể trạng và nâng cao sức mạnh',
    summary:
      'BMI trong khoảng khỏe mạnh. Bạn có thể chọn theo mục tiêu: tăng cơ, tăng sức mạnh hoặc cải thiện thể lực tổng quát.',
    guidelines: [
      'Tập 3–4 buổi mỗi tuần, tăng tạ hoặc số lần dần theo từng tuần.',
      'Kết hợp 1–2 buổi cardio nhẹ hoặc đi bộ nhanh để giữ sức bền.',
      'Ăn cân bằng đạm, tinh bột và chất béo, uống đủ nước.',
    ],
    recommended: ['ppl-intermediate', 'dumbbell-home-intermediate', 'kettlebell-conditioning', 'gym-fullbody-beginner', 'core-abs'],
  },
  overweight: {
    title: 'Kết hợp kháng lực và đốt mỡ',
    summary:
      'BMI cao hơn mức bình thường. Giáo án ưu tiên bài toàn thân, giữ nhịp tim vừa phải và giảm các động tác nhảy tác động mạnh lên khớp.',
    guidelines: [
      'Tạo thâm hụt nhẹ khoảng 300–500 kcal mỗi ngày, không ăn kiêng quá mức.',
      'Thêm 20–30 phút đi bộ nhanh hoặc đạp xe sau buổi tập hoặc vào ngày nghỉ.',
      'Giữ kháng lực 3 buổi mỗi tuần để duy trì cơ khi giảm mỡ.',
      'Khởi động kỹ khớp gối, hông và cổ chân trước khi tập.',
    ],
    recommended: ['fatloss-circuit', 'gym-fullbody-beginner', 'home-bodyweight-beginner', 'kettlebell-conditioning', 'core-abs'],
  },
  obese: {
    title: 'Bắt đầu nhẹ nhàng, ít tác động lên khớp',
    summary:
      'BMI ở mức béo phì. Giáo án chọn các bài ít va đập, có điểm tựa và tăng dần cường độ. Nên hỏi ý kiến bác sĩ trước khi bắt đầu nếu có bệnh nền.',
    guidelines: [
      'Bắt đầu 2–3 buổi mỗi tuần, mỗi buổi 30–40 phút và tăng dần.',
      'Nghỉ đủ giữa các hiệp, dừng ngay nếu đau ngực, chóng mặt hoặc đau khớp.',
      'Ưu tiên đi bộ, đạp xe tại chỗ mỗi ngày 20–30 phút.',
      'Tiến bộ đều đặn quan trọng hơn cường độ; tăng mức khó mỗi 2–3 tuần.',
    ],
    recommended: ['home-bodyweight-beginner', 'gym-fullbody-beginner', 'fatloss-circuit', 'core-abs'],
  },
};

export function buildBmiPlan(bmi: number): BmiPlan {
  const category = getBmiCategory(bmi);
  return { bmi, category, ...PLANS[category] };
}

/** Programs ordered with the BMI-recommended ones first. */
export function sortByRecommendation(programs: PresetProgram[], plan: BmiPlan | null): PresetProgram[] {
  if (!plan) return programs;
  const rank = (id: string) => {
    const i = plan.recommended.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...programs].sort((a, b) => rank(a.id) - rank(b.id));
}

// --- Session adaptation -------------------------------------------------------------------------

/** Lower-impact replacements for jumping or very demanding movements. */
const LOW_IMPACT_SWAPS: Record<string, string> = {
  'Freehand Jump Squat': 'Chair Squat',
  'Star Jump': 'Side Leg Raises',
  'Mountain Climbers': 'Dead Bug',
  'Rope Jumping': 'Step-up with Knee Raise',
};

/** Extra swaps for obese users: remove bodyweight-heavy pulling/pushing that is hard to scale. */
const OBESE_EXTRA_SWAPS: Record<string, string> = {
  Pullups: 'Wide-Grip Lat Pulldown',
  Pushups: 'Incline Push-Up',
  'Bench Dips': 'Triceps Pushdown',
  'Dips - Triceps Version': 'Triceps Pushdown',
  'Hanging Leg Raise': 'Reverse Crunch',
};

export interface AdaptedSession {
  session: PresetSession;
  /** Human-readable list of what changed, empty when nothing was adjusted. */
  changes: string[];
}

export function adaptSession(session: PresetSession, category: BmiCategory): AdaptedSession {
  const changes: string[] = [];
  const swaps: Record<string, string> =
    category === 'overweight'
      ? LOW_IMPACT_SWAPS
      : category === 'obese'
        ? { ...LOW_IMPACT_SWAPS, ...OBESE_EXTRA_SWAPS }
        : {};

  const used = new Set(session.exercises.map(e => e.name));
  const exercises: PresetExercise[] = [];

  for (const e of session.exercises) {
    let next: PresetExercise = { ...e };
    const replacement = swaps[e.name];
    if (replacement && !used.has(replacement)) {
      used.add(replacement);
      changes.push(`${e.name} → ${replacement}`);
      next = { ...e, name: replacement };
    }

    if (category === 'obese') {
      // Fewer sets on shorter holds/high-rep conditioning, gentler volume overall.
      if (next.sets > 3) next = { ...next, sets: next.sets - 1 };
    }

    exercises.push(next);
  }

  const restNote =
    category === 'underweight'
      ? 'Nghỉ 90–120 giây giữa các hiệp'
      : category === 'overweight' || category === 'obese'
        ? 'Nghỉ 45–75 giây giữa các hiệp, giữ nhịp thở đều'
        : '';

  if (restNote && exercises.length > 0) {
    exercises[0] = {
      ...exercises[0],
      notes: exercises[0].notes ? `${exercises[0].notes}. ${restNote}` : restNote,
    };
  }

  if (category === 'obese' && session.exercises.some(e => e.sets > 3)) {
    changes.push('Giảm 1 hiệp ở các bài nhiều hiệp');
  }

  return { session: { ...session, exercises }, changes };
}

export function programsForPlan(plan: BmiPlan | null): PresetProgram[] {
  return sortByRecommendation(PRESET_PROGRAMS, plan);
}
