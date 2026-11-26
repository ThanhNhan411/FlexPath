import { Exercise, TemplateExercise } from '../types';

export type PresetLevel = 'beginner' | 'intermediate' | 'expert';
export type PresetGoal = 'general' | 'muscle' | 'strength' | 'fatloss' | 'core' | 'glutes';
export type PresetEquipment = 'bodyweight' | 'dumbbell' | 'gym' | 'kettlebell';

export interface PresetExercise {
  /** Exact exercise name as it appears in the exercise library (free-exercise-db). */
  name: string;
  sets: number;
  reps: number;
  /** Rest / tempo / coaching cue, shown in the workout as a note. */
  notes?: string;
}

export interface PresetSession {
  name: string;
  focus: string;
  exercises: PresetExercise[];
}

export interface PresetProgram {
  id: string;
  name: string;
  tagline: string;
  description: string;
  level: PresetLevel;
  goal: PresetGoal;
  equipment: PresetEquipment;
  daysPerWeek: number;
  /** Suggested weekly layout, e.g. "A – nghỉ – B – nghỉ – A". */
  schedule: string;
  tips: string[];
  sessions: PresetSession[];
}

export const LEVEL_LABEL: Record<PresetLevel, string> = {
  beginner: 'Người mới',
  intermediate: 'Trung bình',
  expert: 'Nâng cao',
};

export const GOAL_LABEL: Record<PresetGoal, string> = {
  general: 'Thể lực tổng quát',
  muscle: 'Tăng cơ',
  strength: 'Tăng sức mạnh',
  fatloss: 'Giảm mỡ',
  core: 'Cơ bụng & lõi',
  glutes: 'Mông & chân',
};

export const EQUIPMENT_LABEL: Record<PresetEquipment, string> = {
  bodyweight: 'Không dụng cụ',
  dumbbell: 'Tạ đơn',
  gym: 'Phòng gym',
  kettlebell: 'Kettlebell',
};

const ex = (name: string, sets: number, reps: number, notes?: string): PresetExercise => ({ name, sets, reps, notes });

export const PRESET_PROGRAMS: PresetProgram[] = [
  {
    id: 'home-bodyweight-beginner',
    name: 'Toàn thân tại nhà – không dụng cụ',
    tagline: 'Khởi động hành trình chỉ với trọng lượng cơ thể',
    description: 'Hai buổi toàn thân xen kẽ, làm quen các động tác nền tảng: squat, đẩy, kéo và cơ lõi. Không cần dụng cụ, phù hợp tập ở nhà.',
    level: 'beginner',
    goal: 'general',
    equipment: 'bodyweight',
    daysPerWeek: 3,
    schedule: 'A – nghỉ – B – nghỉ – A (tuần sau B – A – B)',
    tips: [
      'Nghỉ 45–60 giây giữa các hiệp.',
      'Khi làm được dễ dàng đủ số lần, thêm 2–3 lần mỗi hiệp trước khi tăng độ khó.',
      'Ưu tiên đúng kỹ thuật hơn số lần.',
    ],
    sessions: [
      {
        name: 'Buổi A – Toàn thân',
        focus: 'Chân, ngực, lõi',
        exercises: [
          ex('Bodyweight Squat', 3, 12),
          ex('Incline Push-Up', 3, 10, 'Tay chống lên ghế hoặc bậc thang'),
          ex('Single Leg Glute Bridge', 3, 10),
          ex('Bench Dips', 3, 8),
          ex('Plank', 3, 1, 'Giữ 20–40 giây mỗi hiệp'),
        ],
      },
      {
        name: 'Buổi B – Toàn thân',
        focus: 'Chân, vai, lưng, bụng',
        exercises: [
          ex('Bodyweight Walking Lunge', 3, 10, 'Mỗi chân 10 bước'),
          ex('Pushups', 3, 8),
          ex('Inverted Row', 3, 8, 'Dùng bàn chắc chắn hoặc thanh ngang thấp'),
          ex('Superman', 3, 12),
          ex('Crunches', 3, 15),
        ],
      },
    ],
  },
  {
    id: 'gym-fullbody-beginner',
    name: 'Full Body 3 ngày – phòng gym',
    tagline: 'Nền tảng sức mạnh cho người mới vào phòng gym',
    description: 'Tập toàn thân 3 buổi/tuần với các bài compound cơ bản trên tạ đòn, tạ đơn và máy. Mỗi buổi bao phủ chân, đẩy, kéo và lõi.',
    level: 'beginner',
    goal: 'muscle',
    equipment: 'gym',
    daysPerWeek: 3,
    schedule: 'A – nghỉ – B – nghỉ – A (tuần sau B – A – B)',
    tips: [
      'Chọn mức tạ để hiệp cuối còn dư khoảng 2 lần.',
      'Nghỉ 90–120 giây ở bài compound, 60 giây ở bài phụ.',
      'Tăng 2,5 kg khi đạt đủ số lần ở tất cả các hiệp.',
    ],
    sessions: [
      {
        name: 'Buổi A',
        focus: 'Squat – đẩy ngang – kéo dọc',
        exercises: [
          ex('Barbell Squat', 3, 8),
          ex('Barbell Bench Press - Medium Grip', 3, 8),
          ex('Wide-Grip Lat Pulldown', 3, 10),
          ex('Dumbbell Shoulder Press', 3, 10),
          ex('Plank', 3, 1, 'Giữ 30–45 giây mỗi hiệp'),
        ],
      },
      {
        name: 'Buổi B',
        focus: 'Hinge – đẩy dọc – kéo ngang',
        exercises: [
          ex('Romanian Deadlift', 3, 8),
          ex('Barbell Shoulder Press', 3, 8),
          ex('Seated Cable Rows', 3, 10),
          ex('Leg Press', 3, 12),
          ex('Triceps Pushdown', 2, 12),
          ex('Barbell Curl', 2, 12),
        ],
      },
    ],
  },
  {
    id: 'dumbbell-home-intermediate',
    name: 'Tạ đơn tại nhà – Thân trên / Thân dưới',
    tagline: 'Chỉ cần một đôi tạ đơn và một chiếc ghế',
    description: 'Chia thân trên và thân dưới, 4 buổi/tuần. Toàn bộ bài tập dùng tạ đơn, thích hợp tập tại nhà hoặc phòng gym nhỏ.',
    level: 'intermediate',
    goal: 'muscle',
    equipment: 'dumbbell',
    daysPerWeek: 4,
    schedule: 'Trên – Dưới – nghỉ – Trên – Dưới – nghỉ – nghỉ',
    tips: [
      'Giữ nhịp hạ tạ chậm 2–3 giây để tăng kích thích cơ.',
      'Nghỉ 60–90 giây giữa các hiệp.',
      'Khi tạ quá nhẹ, tăng số lần tới 15 rồi mới đổi tạ nặng hơn.',
    ],
    sessions: [
      {
        name: 'Thân trên',
        focus: 'Ngực, lưng, vai, tay',
        exercises: [
          ex('Dumbbell Bench Press', 4, 10, 'Có thể nằm sàn nếu không có ghế'),
          ex('One-Arm Dumbbell Row', 4, 10, 'Mỗi tay 10 lần'),
          ex('Dumbbell Shoulder Press', 3, 10),
          ex('Side Lateral Raise', 3, 15),
          ex('Hammer Curls', 3, 12),
          ex('Lying Dumbbell Tricep Extension', 3, 12),
        ],
      },
      {
        name: 'Thân dưới',
        focus: 'Đùi, mông, bắp chân',
        exercises: [
          ex('Goblet Squat', 4, 12),
          ex('Stiff-Legged Dumbbell Deadlift', 4, 10),
          ex('Dumbbell Rear Lunge', 3, 10, 'Mỗi chân 10 lần'),
          ex('Dumbbell Step Ups', 3, 10, 'Mỗi chân 10 lần'),
          ex('Standing Dumbbell Calf Raise', 4, 15),
        ],
      },
    ],
  },
  {
    id: 'ppl-intermediate',
    name: 'Push / Pull / Legs',
    tagline: 'Chia buổi kinh điển để tăng cơ',
    description: 'Ba buổi đẩy – kéo – chân luân phiên. Có thể tập 3 ngày/tuần hoặc lặp lại hai vòng để thành 6 ngày/tuần khi đã quen.',
    level: 'intermediate',
    goal: 'muscle',
    equipment: 'gym',
    daysPerWeek: 3,
    schedule: 'Push – Pull – Legs – nghỉ (lặp lại)',
    tips: [
      'Bài compound đầu buổi: 6–10 lần, nghỉ 2 phút.',
      'Bài phụ: 10–15 lần, nghỉ 60–75 giây.',
      'Tăng tạ hoặc số lần mỗi tuần nếu có thể (progressive overload).',
    ],
    sessions: [
      {
        name: 'Push – Đẩy',
        focus: 'Ngực, vai, tay sau',
        exercises: [
          ex('Barbell Bench Press - Medium Grip', 4, 8),
          ex('Barbell Incline Bench Press - Medium Grip', 3, 10),
          ex('Dumbbell Shoulder Press', 3, 10),
          ex('Side Lateral Raise', 3, 15),
          ex('Triceps Pushdown', 3, 12),
          ex('Dips - Triceps Version', 3, 10),
        ],
      },
      {
        name: 'Pull – Kéo',
        focus: 'Lưng, vai sau, tay trước',
        exercises: [
          ex('Pullups', 4, 8, 'Dùng dây trợ lực nếu chưa đủ sức'),
          ex('Bent Over Barbell Row', 4, 8),
          ex('Seated Cable Rows', 3, 12),
          ex('Face Pull', 3, 15),
          ex('Barbell Curl', 3, 10),
          ex('Hammer Curls', 3, 12),
        ],
      },
      {
        name: 'Legs – Chân',
        focus: 'Đùi trước, đùi sau, mông, bắp chân',
        exercises: [
          ex('Barbell Squat', 4, 8),
          ex('Romanian Deadlift', 3, 10),
          ex('Leg Press', 3, 12),
          ex('Lying Leg Curls', 3, 12),
          ex('Leg Extensions', 3, 15),
          ex('Standing Calf Raises', 4, 15),
        ],
      },
    ],
  },
  {
    id: 'fatloss-circuit',
    name: 'Đốt mỡ Circuit tại nhà',
    tagline: 'Tập nhịp độ cao, tim mạch và sức bền',
    description: 'Hai buổi circuit chuyển bài liên tục, ít nghỉ, kết hợp bài toàn thân và tim mạch. Kết hợp thâm hụt calo hợp lý để giảm mỡ.',
    level: 'beginner',
    goal: 'fatloss',
    equipment: 'bodyweight',
    daysPerWeek: 4,
    schedule: 'Circuit 1 – Circuit 2 – nghỉ – Circuit 1 – Circuit 2 – nghỉ – nghỉ',
    tips: [
      'Làm lần lượt từng bài, nghỉ 15–20 giây giữa bài, 60–90 giây giữa các vòng.',
      'Số hiệp tương ứng với số vòng (3–4 vòng).',
      'Khởi động kỹ 5 phút trước khi bắt đầu.',
    ],
    sessions: [
      {
        name: 'Circuit 1 – Thân dưới & tim mạch',
        focus: 'Nhịp tim cao, chân và mông',
        exercises: [
          ex('Freehand Jump Squat', 4, 12),
          ex('Mountain Climbers', 4, 20),
          ex('Bodyweight Walking Lunge', 4, 12, 'Mỗi chân 12 bước'),
          ex('Star Jump', 4, 20),
          ex('Single Leg Glute Bridge', 4, 12),
        ],
      },
      {
        name: 'Circuit 2 – Thân trên & lõi',
        focus: 'Ngực, vai, tay sau và bụng',
        exercises: [
          ex('Pushups', 4, 10),
          ex('Bench Dips', 4, 12),
          ex('Russian Twist', 4, 20),
          ex('Reverse Crunch', 4, 15),
          ex('Rope Jumping', 4, 60, 'Nhảy dây khoảng 60 lần hoặc 45 giây'),
        ],
      },
    ],
  },
  {
    id: 'core-abs',
    name: 'Cơ bụng & lõi – mọi cấp độ',
    tagline: 'Siết lõi chắc khỏe, hỗ trợ mọi bài tập khác',
    description: 'Hai buổi tập lõi: một buổi không dụng cụ và một buổi dùng cáp, con lăn. Chọn buổi phù hợp hoặc luân phiên 2–3 lần/tuần.',
    level: 'beginner',
    goal: 'core',
    equipment: 'bodyweight',
    daysPerWeek: 3,
    schedule: 'Tập sau buổi chính hoặc vào ngày nhẹ, tối đa 3 lần/tuần',
    tips: [
      'Siết bụng và thở ra khi gồng, không nín thở.',
      'Giữ lưng dưới áp sát sàn ở các bài nằm.',
      'Tập lõi 2–3 lần/tuần là đủ, cơ bụng cần thời gian hồi phục.',
    ],
    sessions: [
      {
        name: 'Lõi không dụng cụ',
        focus: 'Bụng trên, bụng dưới, liên sườn',
        exercises: [
          ex('Plank', 3, 1, 'Giữ 30–60 giây mỗi hiệp'),
          ex('Crunches', 3, 15),
          ex('Reverse Crunch', 3, 12),
          ex('Dead Bug', 3, 10),
          ex('Russian Twist', 3, 20),
          ex('Side Bridge', 2, 1, 'Giữ 20–30 giây mỗi bên'),
        ],
      },
      {
        name: 'Lõi nâng cao – cáp & con lăn',
        focus: 'Chống xoay, gập thân có tải',
        exercises: [
          ex('Cable Crunch', 4, 12),
          ex('Hanging Leg Raise', 3, 10),
          ex('Ab Roller', 3, 8),
          ex('Standing Cable Wood Chop', 3, 12, 'Mỗi bên 12 lần'),
          ex('Pallof Press', 3, 12, 'Mỗi bên 12 lần'),
        ],
      },
    ],
  },
  {
    id: 'glutes-legs',
    name: 'Mông & chân săn chắc',
    tagline: 'Tập trung hông, mông và đùi sau',
    description: 'Hai buổi chân khác nhau: một buổi nặng với tạ đòn và một buổi nhẹ, tập kỹ cơ mông. Phù hợp để cải thiện sức mạnh và đường nét thân dưới.',
    level: 'intermediate',
    goal: 'glutes',
    equipment: 'gym',
    daysPerWeek: 2,
    schedule: 'Nặng – nghỉ – nghỉ – Nhẹ – nghỉ – nghỉ – nghỉ',
    tips: [
      'Siết mông ở đỉnh động tác và giữ 1 giây.',
      'Nghỉ 90 giây ở bài nặng, 45–60 giây ở bài cô lập.',
      'Nên khởi động hông với cầu mông không tạ trước khi vào bài chính.',
    ],
    sessions: [
      {
        name: 'Chân nặng',
        focus: 'Hip thrust, squat, hinge',
        exercises: [
          ex('Barbell Hip Thrust', 4, 10),
          ex('Barbell Squat', 4, 8),
          ex('Romanian Deadlift', 3, 10),
          ex('Dumbbell Rear Lunge', 3, 10, 'Mỗi chân 10 lần'),
          ex('Standing Calf Raises', 3, 15),
        ],
      },
      {
        name: 'Mông & đùi sau – cô lập',
        focus: 'Kích hoạt và cô lập cơ mông',
        exercises: [
          ex('Barbell Glute Bridge', 4, 12),
          ex('Glute Kickback', 3, 15, 'Mỗi chân 15 lần'),
          ex('Lying Leg Curls', 3, 12),
          ex('Dumbbell Step Ups', 3, 10, 'Mỗi chân 10 lần'),
          ex('Single Leg Glute Bridge', 3, 12),
        ],
      },
    ],
  },
  {
    id: 'strength-barbell',
    name: 'Sức mạnh Barbell – Thân trên / Thân dưới',
    tagline: 'Tăng tạ nặng với các bài compound cốt lõi',
    description: 'Dành cho người đã có nền tảng kỹ thuật. Tập nặng, số lần thấp, nghỉ dài, xoay quanh squat, deadlift, bench và đẩy vai.',
    level: 'expert',
    goal: 'strength',
    equipment: 'gym',
    daysPerWeek: 4,
    schedule: 'Dưới – Trên – nghỉ – Dưới – Trên – nghỉ – nghỉ',
    tips: [
      'Nghỉ 2–4 phút giữa các hiệp nặng.',
      'Nên có người hỗ trợ hoặc dùng khung an toàn khi tập nặng.',
      'Ghi lại mức tạ mỗi buổi và tăng nhỏ từng tuần.',
    ],
    sessions: [
      {
        name: 'Thân dưới nặng',
        focus: 'Squat và deadlift',
        exercises: [
          ex('Barbell Squat', 5, 5),
          ex('Barbell Deadlift', 3, 5),
          ex('Front Barbell Squat', 3, 6),
          ex('Good Morning', 3, 8),
          ex('Hanging Leg Raise', 3, 10),
        ],
      },
      {
        name: 'Thân trên nặng',
        focus: 'Bench, đẩy vai, kéo',
        exercises: [
          ex('Barbell Bench Press - Medium Grip', 5, 5),
          ex('Barbell Shoulder Press', 4, 6),
          ex('Bent Over Barbell Row', 4, 6),
          ex('Pullups', 4, 6, 'Có thể gắn thêm tạ vào người'),
          ex('Close-Grip Barbell Bench Press', 3, 8),
        ],
      },
    ],
  },
  {
    id: 'kettlebell-conditioning',
    name: 'Kettlebell toàn thân',
    tagline: 'Sức mạnh, sức bền và phối hợp vận động',
    description: 'Hai buổi toàn thân dùng kettlebell: một buổi bùng nổ với swing/clean, một buổi tập chuyển động chậm và kiểm soát.',
    level: 'intermediate',
    goal: 'general',
    equipment: 'kettlebell',
    daysPerWeek: 3,
    schedule: 'A – nghỉ – B – nghỉ – A (tuần sau B – A – B)',
    tips: [
      'Bắt đầu bằng mức tạ vừa phải để học kỹ thuật hông.',
      'Nghỉ 60–90 giây giữa các hiệp.',
      'Giữ lưng thẳng, đẩy mạnh từ hông thay vì kéo bằng tay.',
    ],
    sessions: [
      {
        name: 'Buổi A – Bùng nổ',
        focus: 'Hông, vai, toàn thân',
        exercises: [
          ex('One-Arm Kettlebell Swings', 4, 15, 'Mỗi tay 15 lần'),
          ex('One-Arm Kettlebell Clean', 3, 8, 'Mỗi tay 8 lần'),
          ex('Kettlebell Thruster', 3, 10),
          ex('Kettlebell Sumo High Pull', 3, 12),
          ex('Kettlebell Halo', 3, 10),
        ],
      },
      {
        name: 'Buổi B – Kiểm soát',
        focus: 'Chân, kéo, đẩy, ổn định',
        exercises: [
          ex('Front Squats With Two Kettlebells', 4, 8),
          ex('Alternating Kettlebell Row', 3, 10),
          ex('Alternating Kettlebell Press', 3, 8),
          ex('Kettlebell One-Legged Deadlift', 3, 8, 'Mỗi chân 8 lần'),
          ex('Kettlebell Overhead Triceps Extension', 3, 12),
        ],
      },
    ],
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Resolve a preset session to concrete template exercises using the loaded exercise library.
 * Exercises that cannot be found (e.g. library failed to load) are skipped.
 */
export function resolveSession(session: PresetSession, library: Exercise[]): TemplateExercise[] {
  const byName = new Map<string, Exercise>();
  library.forEach(e => {
    const key = norm(e.name);
    if (!byName.has(key)) byName.set(key, e);
  });

  const result: TemplateExercise[] = [];
  for (const item of session.exercises) {
    const found = byName.get(norm(item.name));
    if (!found) continue;
    result.push({
      exerciseId: found.id,
      exerciseName: found.name,
      sets: item.sets,
      reps: item.reps,
      notes: item.notes ?? '',
    });
  }
  return result;
}
