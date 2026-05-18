import { Exercise, WorkoutTemplate, TemplateExercise } from '../types';

export const SAMPLE_TEMPLATES = [
  {
    name: "Thể Lực (Beginner) - Toàn Thân Không Dụng Cụ",
    description: "Giáo án này cực kỳ phù hợp cho người mới bắt đầu, có thể tập ngay tại nhà mà không cần bất kỳ thiết bị nào.",
    exerciseNames: [
      "Bodyweight Squat",
      "Push-Up Wide",
      "Bench Dips",
      "Butt Lift - Bridge",
      "Crunch - Hands Overhead"
    ]
  },
  {
    name: "Trung Bình (Intermediate) - Thân Trên / Thân Dưới với Tạ Đơn",
    description: "Dành cho người tập đã có kinh nghiệm, thích hợp cho việc tập tại nhà hoặc phòng gym chỉ với tạ đơn và một chiếc ghế.",
    exerciseNames: [
      "Dumbbell Floor Press",
      "Standing Palms-In Dumbbell Press",
      "Zottman Curl",
      "Lying Dumbbell Tricep Extension",
      "Dumbbell Squat To A Bench",
      "Dumbbell Rear Lunge",
      "Standing Dumbbell Calf Raise"
    ]
  },
  {
    name: "Nâng Cao (Expert) - Sức Mạnh Bùng Nổ Thân Dưới (Barbell)",
    description: "Dành cho người tập chuyên nghiệp muốn bứt phá sức mạnh và khối lượng tạ, yêu cầu phải có khung gánh tạ.",
    exerciseNames: [
      "Front Barbell Squat",
      "Reverse Band Deadlift",
      "Good Morning off Pins",
      "Speed Squats",
      "Weighted Sissy Squat"
    ]
  },
  {
    name: "Chuyên Sâu Lõi & Bụng (Core & Abs) - Mọi Cấp Độ",
    description: "Tập trung rèn luyện cơ cốt lõi từ dùng máy, tạ cho tới không dụng cụ.",
    exerciseNames: [
      "Cable Crunch",
      "Pallof Press",
      "Ab Roller",
      "Press Sit-Up",
      "Hanging Leg Raise"
    ]
  },
  {
    name: "Sức Mạnh Thực Chiến & Strongman (Kettlebell)",
    description: "Giáo án thiết kế riêng để rèn luyện sức mạnh thực chiến toàn thân và độ bền bỉ.",
    exerciseNames: [
      "Tire Flip",
      "Farmer's Walk",
      "Kettlebell Pistol Squat",
      "Double Kettlebell Snatch"
    ]
  }
];

export function buildTemplateFromSample(sample: typeof SAMPLE_TEMPLATES[0], exercises: Exercise[]): { name: string; description: string; exercises: TemplateExercise[] } {
  const templateExercises: TemplateExercise[] = [];
  
  sample.exerciseNames.forEach(name => {
    // try to find the exercise by name (fuzzy matching, or includes)
    const matched = exercises.find(ex => ex.name.toLowerCase().includes(name.toLowerCase()));
    if (matched) {
      templateExercises.push({
        exerciseId: matched.id,
        exerciseName: matched.name,
        sets: 3,
        reps: 10,
        notes: ''
      });
    }
  });

  return {
    name: sample.name,
    description: sample.description,
    exercises: templateExercises
  };
}
