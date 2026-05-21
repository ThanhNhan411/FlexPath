import React from 'react';
import { 
  Trophy, 
  Activity, 
  Shield, 
  Flame, 
  Zap, 
  Infinity as InfinityIcon, 
  Award, 
  Anchor, 
  Sun, 
  RefreshCw, 
  Crown, 
  CalendarCheck
} from 'lucide-react';
import { Workout } from '../types';

export interface Badge {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  icon?: React.ElementType;
  imageUrl?: string;
  gradientClass: string;
  glowColor: string;
  category: 'basic' | 'legend';
  targetField: 'workouts' | 'volume' | 'calories' | 'streak' | 'duration' | 'weekly';
  targetValue: number;
  unit: string;
}

export const BADGES: Badge[] = [
  // Basic & Intermediate Group
  {
    id: 'cyber_rookie',
    title: 'Tân Binh Cyber',
    description: 'Hoàn thành 1 buổi tập đầu tiên.',
    longDescription: 'Chào mừng bạn bước chân vào mạng lưới hiệu năng. Đây là viên gạch đầu tiên đặt nền móng cho cơ thể cấp độ Cyborg của bạn.',
    imageUrl: '/badges/cyber_rookie.png',
    gradientClass: 'from-cyan-400 via-blue-500 to-indigo-600',
    glowColor: 'rgba(34, 211, 238, 0.4)',
    category: 'basic',
    targetField: 'workouts',
    targetValue: 1,
    unit: 'buổi'
  },
  {
    id: 'endurance_warrior',
    title: 'Chiến Binh Bền Bỉ',
    description: 'Hoàn thành 10 buổi tập luyện.',
    longDescription: 'Khả năng vận hành liên tục không lỗi. Hệ tim mạch và cơ bắp đã bắt đầu thích nghi với cường độ lập trình nặng.',
    imageUrl: '/badges/endurance_warrior.png',
    gradientClass: 'from-emerald-400 via-teal-500 to-cyan-600',
    glowColor: 'rgba(52, 211, 153, 0.4)',
    category: 'basic',
    targetField: 'workouts',
    targetValue: 10,
    unit: 'buổi'
  },
  {
    id: 'flame_overlord',
    title: 'Chúa Tể Calo',
    description: 'Đốt cháy trên 500 kcal trong một buổi tập.',
    longDescription: 'Lò phản ứng nhiệt lượng quá tải. Bạn đã giải phóng một nguồn năng lượng khổng lồ vượt qua ngưỡng giới hạn thông thường.',
    imageUrl: '/badges/flame_overlord.png',
    gradientClass: 'from-amber-400 via-orange-500 to-red-600',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    category: 'basic',
    targetField: 'calories',
    targetValue: 500,
    unit: 'kcal'
  },
  {
    id: 'perpetual_motion',
    title: 'Động Cơ Vĩnh Cửu',
    description: 'Đạt chuỗi tập luyện liên tục 3 ngày.',
    longDescription: 'Duy trì dòng điện hoạt động liên tiếp. Lặp lại chu kỳ không gián đoạn là chìa khóa mở khóa tiềm năng ẩn sâu.',
    imageUrl: '/badges/perpetual_motion.png',
    gradientClass: 'from-yellow-300 via-amber-400 to-orange-500',
    glowColor: 'rgba(253, 224, 71, 0.4)',
    category: 'basic',
    targetField: 'streak',
    targetValue: 3,
    unit: 'ngày'
  },
  {
    id: 'limitless',
    title: 'Không Giới Hạn',
    description: 'Hoàn thành buổi tập dài từ 60 phút trở lên.',
    longDescription: 'Hệ thống năng lượng hoạt động bền bỉ, phá vỡ định luật thời gian thông thường của một buổi tập chuẩn.',
    icon: InfinityIcon,
    imageUrl: '/badges/limitless.png',
    gradientClass: 'from-violet-400 via-purple-500 to-pink-500',
    glowColor: 'rgba(167, 139, 250, 0.4)',
    category: 'basic',
    targetField: 'duration',
    targetValue: 60,
    unit: 'phút'
  },
  {
    id: 'god_mode',
    title: 'Kiện Tướng Thể Hình',
    description: 'Hoàn thành 50 buổi tập luyện.',
    longDescription: 'Chính thức gia nhập hàng ngũ những thực thể có kỷ luật thép. Cơ thể bạn đã được tái cấu trúc hoàn toàn.',
    icon: Trophy,
    imageUrl: '/badges/god_mode.png',
    gradientClass: 'from-pink-500 via-rose-500 to-red-600',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    category: 'basic',
    targetField: 'workouts',
    targetValue: 50,
    unit: 'buổi'
  },

  // Long-Term & High Difficulty Group
  {
    id: 'silicon_legend',
    title: 'Huyền Thoại Silicon',
    description: 'Hoàn thành tích lũy 100 buổi tập.',
    longDescription: 'Biểu tượng của sự trường tồn vĩnh cửu. Bạn là lõi xử lý trung tâm của mạng lưới tập luyện FitTrack.',
    icon: Award,
    imageUrl: '/badges/silicon_legend.png',
    gradientClass: 'from-fuchsia-500 via-purple-600 to-indigo-700',
    glowColor: 'rgba(217, 70, 239, 0.4)',
    category: 'legend',
    targetField: 'workouts',
    targetValue: 100,
    unit: 'buổi'
  },
  {
    id: 'gravity_conqueror',
    title: 'Kẻ Chinh Phục Trọng Lực',
    description: 'Tổng khối lượng tạ đạt 100,000 kg.',
    longDescription: 'Nhấc bổng cả một hòn đảo. Lực hút của Trái Đất không còn là rào cản đối với khung xương chịu lực của bạn.',
    icon: Anchor,
    imageUrl: '/badges/gravity_conqueror.png',
    gradientClass: 'from-blue-500 via-indigo-600 to-purple-800',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    category: 'legend',
    targetField: 'volume',
    targetValue: 100000,
    unit: 'kg'
  },
  {
    id: 'nuclear_reactor',
    title: 'Lò Phản Ứng Hạt Nhân',
    description: 'Tích lũy đốt cháy 20,000 kcal.',
    longDescription: 'Sản sinh năng lượng ở cấp độ nguyên tử. Bạn đã giải phóng nguồn nhiệt lượng khổng lồ đủ để thắp sáng cả một thành phố.',
    icon: Sun,
    imageUrl: '/badges/nuclear_reactor.png',
    gradientClass: 'from-amber-500 via-red-500 to-rose-700',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    category: 'legend',
    targetField: 'calories',
    targetValue: 20000,
    unit: 'kcal'
  },
  {
    id: 'endless_cycle',
    title: 'Chu Kỳ Vô Tận',
    description: 'Đạt chuỗi tập luyện liên tiếp 7 ngày.',
    longDescription: 'Khóa chặt kỷ luật, vận hành không mệt mỏi trong suốt một tuần hoàn chỉnh. Một kỳ tích của ý chí bền bỉ.',
    icon: RefreshCw,
    imageUrl: '/badges/endless_cycle.png',
    gradientClass: 'from-teal-400 via-emerald-500 to-green-600',
    glowColor: 'rgba(45, 212, 191, 0.4)',
    category: 'legend',
    targetField: 'streak',
    targetValue: 7,
    unit: 'ngày'
  },
  {
    id: 'titanium_will',
    title: 'Ý Chí Titanium',
    description: 'Tổng thời gian tập đạt 100 giờ.',
    longDescription: '100 giờ rèn giũa dưới áp lực cực cao. Tế bào của bạn đã được tôi luyện cứng cáp như kim loại Titanium vũ trụ.',
    icon: Crown,
    imageUrl: '/badges/titanium_will.png',
    gradientClass: 'from-yellow-400 via-amber-500 to-red-500',
    glowColor: 'rgba(250, 204, 21, 0.4)',
    category: 'legend',
    targetField: 'duration',
    targetValue: 6000, // 100 hours in minutes
    unit: 'phút'
  },
  {
    id: 'iron_discipline',
    title: 'Kỷ Luật Thép',
    description: 'Tập từ 3 buổi/tuần trở lên trong 4 tuần liên tiếp.',
    longDescription: 'Tần suất vận hành hoàn hảo, không một vết nứt trong lịch trình. Minh chứng rõ nhất cho thói quen sắt đá của nhà vô địch.',
    icon: CalendarCheck,
    imageUrl: '/badges/iron_discipline.png',
    gradientClass: 'from-orange-400 via-red-500 to-indigo-600',
    glowColor: 'rgba(251, 146, 60, 0.4)',
    category: 'legend',
    targetField: 'weekly',
    targetValue: 4, // 4 consecutive weeks
    unit: 'tuần'
  }
];

export interface AchievementStats {
  workoutsCount: number;
  volume: number;
  calories: number;
  totalCalories: number;
  streak: number;
  duration: number;
  totalDurationMinutes: number;
  weekly: number;
}

export function calculateAchievementStats(workouts: Workout[]): AchievementStats {
  let totalVolume = 0;
  let maxSingleCalorie = 0;
  let totalCalories = 0;
  let maxSingleDuration = 0;
  let totalDurationMinutes = 0;
  const completedWorkouts = workouts.filter(w => w.status === 'completed');

  completedWorkouts.forEach(w => {
    totalVolume += w.totalVolume || 0;
    const cal = w.calories !== undefined && w.calories !== null ? w.calories : Math.round((5.0 * 3.5 * 70 / 200) * ((w.duration || 0) / 60));
    totalCalories += cal;
    maxSingleCalorie = Math.max(maxSingleCalorie, cal);

    // Duration calculations
    let durMins = 0;
    if (w.duration) {
      durMins = Math.floor(w.duration / 60);
    } else if (w.endTime) {
      const ms = new Date(w.endTime).getTime() - new Date(w.startTime).getTime();
      durMins = Math.floor(ms / 60000);
    }
    totalDurationMinutes += durMins;
    maxSingleDuration = Math.max(maxSingleDuration, durMins);
  });

  // Compute Streak
  const workoutDates = completedWorkouts.map(w => {
    const d = new Date(w.startTime);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }).sort((a, b) => b - a); // descending

  const uniqueDates = Array.from(new Set(workoutDates));

  let currentStreak = 0;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  let hasToday = uniqueDates.includes(todayMidnight);
  let hasYesterday = uniqueDates.includes(todayMidnight - oneDayMs);

  if (hasToday || hasYesterday) {
    let checkDate = hasToday ? todayMidnight : todayMidnight - oneDayMs;
    currentStreak = 1;
    
    while (uniqueDates.includes(checkDate - oneDayMs)) {
      currentStreak++;
      checkDate -= oneDayMs;
    }
  }

  // Compute Weekly Consistency (3+ workouts/week in consecutive weeks)
  const getISOWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
  };

  const weekCounts: { [key: string]: number } = {};
  completedWorkouts.forEach(w => {
    const wk = getISOWeek(w.startTime);
    weekCounts[wk] = (weekCounts[wk] || 0) + 1;
  });

  const sortedWeeks = Object.keys(weekCounts).sort();
  let maxConsecutiveWeeks = 0;
  let tempConsecutiveWeeks = 0;

  const areWeeksSequential = (w1: string, w2: string) => {
    const parseWeek = (wStr: string) => {
      const parts = wStr.split('-W');
      return { yr: parseInt(parts[0]), wk: parseInt(parts[1]) };
    };
    const p1 = parseWeek(w1);
    const p2 = parseWeek(w2);
    if (p1.yr === p2.yr) {
      return p2.wk === p1.wk + 1;
    } else if (p2.yr === p1.yr + 1) {
      return p1.wk >= 52 && p2.wk === 1;
    }
    return false;
  };

  for (let i = 0; i < sortedWeeks.length; i++) {
    if (weekCounts[sortedWeeks[i]] >= 3) {
      if (tempConsecutiveWeeks === 0) {
        tempConsecutiveWeeks = 1;
      } else if (areWeeksSequential(sortedWeeks[i - 1], sortedWeeks[i])) {
        tempConsecutiveWeeks++;
      } else {
        maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, tempConsecutiveWeeks);
        tempConsecutiveWeeks = 1;
      }
    } else {
      maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, tempConsecutiveWeeks);
      tempConsecutiveWeeks = 0;
    }
  }
  maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, tempConsecutiveWeeks);

  return {
    workoutsCount: completedWorkouts.length,
    volume: totalVolume,
    calories: maxSingleCalorie,
    totalCalories,
    streak: currentStreak,
    duration: maxSingleDuration,
    totalDurationMinutes,
    weekly: maxConsecutiveWeeks
  };
}

export interface BadgeProgress {
  current: number;
  target: number;
  percentage: number;
}

export function getBadgeProgress(badge: Badge, stats: AchievementStats): BadgeProgress {
  let currentVal = 0;
  switch (badge.targetField) {
    case 'workouts':
      currentVal = stats.workoutsCount;
      break;
    case 'volume':
      currentVal = stats.volume;
      break;
    case 'calories':
      currentVal = badge.id === 'nuclear_reactor' ? stats.totalCalories : stats.calories;
      break;
    case 'streak':
      currentVal = stats.streak;
      break;
    case 'duration':
      currentVal = badge.id === 'titanium_will' ? stats.totalDurationMinutes : stats.duration;
      break;
    case 'weekly':
      currentVal = stats.weekly;
      break;
  }
  return {
    current: currentVal,
    target: badge.targetValue,
    percentage: Math.min(100, Math.floor((currentVal / badge.targetValue) * 100))
  };
}

export function isBadgeUnlocked(badgeId: string, unlockedBadges: { badgeId: string }[], stats: AchievementStats): boolean {
  if (unlockedBadges.some(b => b.badgeId === badgeId)) return true;
  
  const badge = BADGES.find(b => b.id === badgeId);
  if (!badge) return false;
  const progress = getBadgeProgress(badge, stats);
  return progress.current >= progress.target;
}
