export type MuscleGroup = "Chest" | "Back" | "Legs" | "Shoulders" | "Arms" | "Core" | "Cardio";

export interface Exercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
  gifUrl: string | null;
}

export interface SetLog {
  reps: number;
  weight: number;
  completed: boolean;
  timestamp: string;
}

export interface ExerciseLog {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: SetLog[];
  calories?: number;
}

export interface TemplateExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  status: "active" | "completed" | "cancelled";
  totalVolume?: number;
  duration?: number;
  calories?: number;
}

export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: string;
}

export interface HealthProfile {
  height: number;
  weight: number;
  age: number;
  gender: string;
  bmi: number;
  updatedAt: string;
  unlockedAchievements?: UnlockedBadge[];
}
