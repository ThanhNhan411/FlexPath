import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Calendar,
  Lock,
  X,
  Share2,
  TrendingUp,
  Clock,
  Loader2,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { Workout, HealthProfile } from '../types';
import { cn } from '../lib/utils';

// Static Badges Definition
export interface Badge {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  icon: React.ElementType;
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
    icon: Activity,
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
    icon: Shield,
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
    icon: Flame,
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
    icon: Zap,
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
    gradientClass: 'from-orange-400 via-red-500 to-indigo-600',
    glowColor: 'rgba(251, 146, 60, 0.4)',
    category: 'legend',
    targetField: 'weekly',
    targetValue: 4, // 4 consecutive weeks
    unit: 'tuần'
  }
];

export default function Achievements() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<{ badgeId: string, unlockedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  
  interface ToastMessage {
    id: string;
    badge: Badge;
  }
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (badge: Badge) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, badge }]);
    
    // TTS voice synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`Chúc mừng bạn đã mở khóa thành tích: ${badge.title}`);
      utterance.lang = 'vi-VN';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Auto dismiss toasts
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  const user = auth.currentUser;

  // Load Workouts & Profile Achievements data
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        // Load Workouts
        const wQuery = query(
          collection(db, 'workouts'),
          where('userId', '==', user.uid)
        );
        const wSnapshot = await getDocs(wQuery);
        const wList = wSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Workout[];
        setWorkouts(wList);

        // Load Health Profile
        const pSnap = await getDoc(doc(db, 'health_profiles', user.uid));
        if (pSnap.exists()) {
          const profile = pSnap.data() as HealthProfile;
          if (profile.unlockedAchievements) {
            setUnlockedBadges(profile.unlockedAchievements);
          }
        }
      } catch (error) {
        console.error("Error loading achievements data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Compute accumulated metrics from workouts
  const stats = useMemo(() => {
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
    // Group workouts by ISO week number
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

    // Find the longest consecutive run of weeks with >= 3 workouts
    const sortedWeeks = Object.keys(weekCounts).sort();
    let maxConsecutiveWeeks = 0;
    let tempConsecutiveWeeks = 0;

    // A helper to check if two weeks are sequential
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
        // Simple approximation for year rollover (week 52/53 to week 1)
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
  }, [workouts]);

  // Check achievement progress
  const getBadgeProgress = (badge: Badge) => {
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
  };

  const isBadgeUnlocked = (badgeId: string) => {
    if (unlockedBadges.some(b => b.badgeId === badgeId)) return true;
    
    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return false;
    const progress = getBadgeProgress(badge);
    return progress.current >= progress.target;
  };

  const getUnlockDate = (badgeId: string) => {
    const badge = unlockedBadges.find(b => b.badgeId === badgeId);
    const d = badge ? new Date(badge.unlockedAt) : new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  // Retroactive Auto-Sync Effect to Firestore
  useEffect(() => {
    if (loading || !user || BADGES.length === 0 || workouts.length === 0) return;
    
    const newlyRetroUnlocked: { badgeId: string, unlockedAt: string }[] = [];
    const existingIds = new Set(unlockedBadges.map(b => b.badgeId));
    
    BADGES.forEach(badge => {
      if (existingIds.has(badge.id)) return;
      
      const progress = getBadgeProgress(badge);
      if (progress.current >= progress.target) {
        newlyRetroUnlocked.push({
          badgeId: badge.id,
          unlockedAt: new Date().toISOString()
        });
      }
    });
    
    if (newlyRetroUnlocked.length > 0) {
      async function syncRetroAchievements() {
        try {
          const healthProfileRef = doc(db, 'health_profiles', user!.uid);
          const pSnap = await getDoc(healthProfileRef);
          let profileData = {};
          if (pSnap.exists()) {
            profileData = pSnap.data();
          }
          const updatedAchievements = [...unlockedBadges, ...newlyRetroUnlocked];
          await setDoc(healthProfileRef, {
            ...profileData,
            unlockedAchievements: updatedAchievements,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          setUnlockedBadges(updatedAchievements);

          // Trigger toast notification for each retroactively unlocked badge
          newlyRetroUnlocked.forEach(item => {
            const badge = BADGES.find(b => b.id === item.badgeId);
            if (badge) {
              addToast(badge);
            }
          });
        } catch (e) {
          console.error("Error syncing retro achievements:", e);
        }
      }
      syncRetroAchievements();
    }
  }, [loading, user, workouts, unlockedBadges]);

  // Divide badges
  const basicBadges = BADGES.filter(b => b.category === 'basic');
  const legendBadges = BADGES.filter(b => b.category === 'legend');

  const unlockedCount = useMemo(() => {
    return BADGES.filter(b => isBadgeUnlocked(b.id)).length;
  }, [unlockedBadges, stats]);

  const completionRate = useMemo(() => {
    if (BADGES.length === 0) return 0;
    return Math.floor((unlockedCount / BADGES.length) * 100);
  }, [unlockedCount]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
        <span className="text-xs font-mono uppercase tracking-widest text-brand/40">Đang quét cơ sở dữ liệu holographic...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Overview Stat Circular Panel */}
      <div className="glass-panel p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 border border-white/5 bg-gradient-to-br from-white/5 to-transparent">
        {/* Glowing background shapes */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-accent/10 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none" />
        
        {/* Radial Progress indicator */}
        <div className="relative shrink-0 flex items-center justify-center w-36 h-36">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="72" cy="72" r="64" className="stroke-white/5 fill-none" strokeWidth="8" />
            <motion.circle 
              cx="72" 
              cy="72" 
              r="64" 
              className="stroke-accent fill-none" 
              strokeWidth="8"
              strokeDasharray={402}
              initial={{ strokeDashoffset: 402 }}
              animate={{ strokeDashoffset: 402 - (402 * completionRate) / 100 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255,107,0,0.5))' }}
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{unlockedCount}</span>
            <span className="text-white/40 text-xs block font-mono">/ {BADGES.length} Badges</span>
          </div>
        </div>

        <div className="space-y-3 text-center md:text-left">
          <h2 className="text-2xl font-bold tracking-tight">Hệ thống Huy Hiệu Thành Tích</h2>
          <p className="text-sm text-brand/60 leading-relaxed max-w-xl">
            Tập luyện nghiêm túc để kích hoạt các lõi năng lượng holographic. Mỗi huy hiệu đại diện cho một cột mốc ý chí của bạn trong quá trình cải tạo sức mạnh thể chất.
          </p>
          
          {/* Small cumulative numbers */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 pt-2 text-xs font-mono text-brand/40">
            <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-accent" /> Tích lũy: {(stats.volume / 1000).toFixed(1)}k tấn</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-cyan-400" /> Tổng giờ: {(stats.totalDurationMinutes / 60).toFixed(1)}h</span>
            <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-500" /> Đốt: {stats.totalCalories.toLocaleString()} kcal</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-yellow-400" /> Streak: {stats.streak} ngày</span>
          </div>
        </div>
      </div>

      {/* Basic Achievements Group */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-base uppercase tracking-wider text-cyan-400">Huy hiệu Thử thách Cơ bản</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {basicBadges.map((badge) => {
            const unlocked = isBadgeUnlocked(badge.id);
            const progress = getBadgeProgress(badge);
            const Icon = badge.icon;
            
            return (
              <motion.div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                whileHover={{ y: -4, scale: 1.02 }}
                className={cn(
                  "glass-panel p-4 flex flex-col items-center justify-between text-center relative overflow-hidden cursor-pointer group transition-all duration-300 border border-white/5",
                  unlocked 
                    ? "bg-gradient-to-b from-white/[0.03] to-transparent hover:border-white/10" 
                    : "opacity-60 grayscale hover:grayscale-0 bg-black/40 hover:opacity-100"
                )}
                style={{
                  boxShadow: unlocked ? `0 0 15px -5px ${badge.glowColor}` : 'none'
                }}
              >
                {/* Glowing neon top accent line */}
                {unlocked && (
                  <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", badge.gradientClass)} />
                )}

                <div className="py-4 flex flex-col items-center gap-3">
                  <div 
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative shrink-0",
                      unlocked ? cn("bg-gradient-to-br text-white", badge.gradientClass) : "bg-white/5 text-white/20"
                    )}
                    style={{
                      boxShadow: unlocked ? `0 0 20px ${badge.glowColor}` : 'none'
                    }}
                  >
                    <Icon className="w-6 h-6" />
                    {!unlocked && (
                      <div className="absolute -bottom-1 -right-1 bg-ink/90 p-0.5 rounded-full border border-white/10">
                        <Lock className="w-2.5 h-2.5 text-white/40" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white line-clamp-1">{badge.title}</h4>
                    <p className="text-[10px] text-white/40 mt-1 line-clamp-2 px-1 leading-snug">{badge.description}</p>
                  </div>
                </div>

                {/* Progress bar or unlock date */}
                <div className="w-full pt-3 border-t border-white/5 mt-auto">
                  {unlocked ? (
                    <span className="text-[9px] font-mono uppercase text-accent tracking-wider font-bold">Đạt ngày {getUnlockDate(badge.id)}</span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-mono text-white/40">
                        <span>Tiến độ</span>
                        <span>{progress.current} / {progress.target}</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="h-full bg-white/20 rounded-full" style={{ width: `${progress.percentage}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend Achievements Group */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-base uppercase tracking-wider text-amber-500">Thành tích Cao cấp & Dài hạn</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {legendBadges.map((badge) => {
            const unlocked = isBadgeUnlocked(badge.id);
            const progress = getBadgeProgress(badge);
            const Icon = badge.icon;
            
            return (
              <motion.div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                whileHover={{ y: -4, scale: 1.02 }}
                className={cn(
                  "glass-panel p-4 flex flex-col items-center justify-between text-center relative overflow-hidden cursor-pointer group transition-all duration-300 border border-white/5",
                  unlocked 
                    ? "bg-gradient-to-b from-white/[0.03] to-transparent hover:border-white/10" 
                    : "opacity-60 grayscale hover:grayscale-0 bg-black/40 hover:opacity-100"
                )}
                style={{
                  boxShadow: unlocked ? `0 0 15px -3px ${badge.glowColor}` : 'none'
                }}
              >
                {/* Glowing neon top accent line */}
                {unlocked && (
                  <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", badge.gradientClass)} />
                )}

                <div className="py-4 flex flex-col items-center gap-3">
                  <div 
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative shrink-0",
                      unlocked ? cn("bg-gradient-to-br text-white", badge.gradientClass) : "bg-white/5 text-white/20"
                    )}
                    style={{
                      boxShadow: unlocked ? `0 0 20px ${badge.glowColor}` : 'none'
                    }}
                  >
                    <Icon className="w-6 h-6" />
                    {!unlocked && (
                      <div className="absolute -bottom-1 -right-1 bg-ink/90 p-0.5 rounded-full border border-white/10">
                        <Lock className="w-2.5 h-2.5 text-white/40" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white line-clamp-1">{badge.title}</h4>
                    <p className="text-[10px] text-white/40 mt-1 line-clamp-2 px-1 leading-snug">{badge.description}</p>
                  </div>
                </div>

                {/* Progress bar or unlock date */}
                <div className="w-full pt-3 border-t border-white/5 mt-auto">
                  {unlocked ? (
                    <span className="text-[9px] font-mono uppercase text-accent tracking-wider font-bold">Đạt ngày {getUnlockDate(badge.id)}</span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-mono text-white/40">
                        <span>Tiến độ</span>
                        <span>
                          {badge.id === 'gravity_conqueror' 
                            ? (progress.current / 1000).toFixed(0) 
                            : badge.id === 'titanium_will' 
                              ? (progress.current / 60).toFixed(1) 
                              : progress.current}
                          /
                          {badge.id === 'gravity_conqueror' 
                            ? (progress.target / 1000).toFixed(0) 
                            : badge.id === 'titanium_will' 
                              ? (progress.target / 60).toFixed(0) 
                              : progress.target}
                          {' '}{badge.id === 'gravity_conqueror' 
                            ? 'tấn' 
                            : badge.id === 'titanium_will' 
                              ? 'giờ' 
                              : badge.unit}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="h-full bg-white/20 rounded-full" style={{ width: `${progress.percentage}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Badge Info Detail Modal overlay */}
      <AnimatePresence>
        {selectedBadge && (() => {
          const unlocked = isBadgeUnlocked(selectedBadge.id);
          const progress = getBadgeProgress(selectedBadge);
          const Icon = selectedBadge.icon;
          
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Blur backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedBadge(null)}
                className="absolute inset-0 bg-ink/80 backdrop-blur-md"
              />

              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-sm glass-panel overflow-hidden border border-white/10 relative p-6 bg-gradient-to-b from-white/5 to-black/90 shadow-2xl"
                style={{
                  boxShadow: unlocked ? `0 0 30px -10px ${selectedBadge.glowColor}` : 'none'
                }}
              >
                {/* Glowing neon top accent line */}
                {unlocked && (
                  <div className={cn("absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r", selectedBadge.gradientClass)} />
                )}

                {/* Close Button */}
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center space-y-5 pt-4">
                  {/* Glowing icon */}
                  <div 
                    className={cn(
                      "w-20 h-20 rounded-2xl flex items-center justify-center relative shrink-0",
                      unlocked ? cn("bg-gradient-to-br text-white", selectedBadge.gradientClass) : "bg-white/5 text-white/20"
                    )}
                    style={{
                      boxShadow: unlocked ? `0 0 30px ${selectedBadge.glowColor}` : 'none'
                    }}
                  >
                    <Icon className="w-10 h-10" />
                    {!unlocked && <Lock className="absolute w-5 h-5 text-white/40" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-xl font-extrabold text-white tracking-tight">{selectedBadge.title}</h3>
                      {unlocked && <CheckCircle2 className="w-4.5 h-4.5 text-accent" />}
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-brand/40 block">
                      {selectedBadge.category === 'basic' ? 'Thử thách cơ bản' : 'Thành tích cao cấp'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 w-full text-xs text-white/70 leading-relaxed text-left">
                    <p className="font-semibold text-white/90 mb-1 text-center">Yêu cầu mở khóa:</p>
                    <p className="text-center text-brand/60 mb-3">{selectedBadge.description}</p>
                    <p className="border-t border-white/5 pt-2 italic text-white/50 text-center font-mono">
                      "{selectedBadge.longDescription}"
                    </p>
                  </div>

                  {/* Progress Details */}
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/40">Tiến trình đạt</span>
                      <span className="text-white font-bold">
                        {selectedBadge.id === 'gravity_conqueror' 
                          ? (progress.current / 1000).toFixed(0) 
                          : selectedBadge.id === 'titanium_will' 
                            ? (progress.current / 60).toFixed(1) 
                            : progress.current}
                        {' '} / {' '}
                        {selectedBadge.id === 'gravity_conqueror' 
                          ? (progress.target / 1000).toFixed(0) 
                          : selectedBadge.id === 'titanium_will' 
                            ? (progress.target / 60).toFixed(0) 
                            : progress.target}
                        {' '}{selectedBadge.id === 'gravity_conqueror' 
                          ? 'tấn tạ' 
                          : selectedBadge.id === 'titanium_will' 
                            ? 'giờ' 
                            : selectedBadge.unit}
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-300 bg-gradient-to-r", selectedBadge.gradientClass)} 
                        style={{ width: `${progress.percentage}%` }} 
                      />
                    </div>
                    {unlocked ? (
                      <p className="text-[10px] font-mono text-accent text-center font-bold tracking-wide">
                        ĐÃ MỞ KHÓA VÀO NGÀY {getUnlockDate(selectedBadge.id)}
                      </p>
                    ) : (
                      <p className="text-[10px] font-mono text-white/40 text-center">
                        Hoàn thành thêm {selectedBadge.id === 'gravity_conqueror' 
                          ? ((selectedBadge.targetValue - progress.current) / 1000).toFixed(1) 
                          : selectedBadge.id === 'titanium_will' 
                            ? ((selectedBadge.targetValue - progress.current) / 60).toFixed(1) 
                            : (selectedBadge.targetValue - progress.current)} {selectedBadge.id === 'gravity_conqueror' 
                              ? 'tấn tạ' 
                              : selectedBadge.id === 'titanium_will' 
                                ? 'giờ' 
                                : selectedBadge.unit} để mở khóa.
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  {unlocked ? (
                    <button
                      onClick={() => alert(`Tính năng chia sẻ ảnh huy hiệu ${selectedBadge.title} sắp ra mắt!`)}
                      className="w-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 mt-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Chia sẻ huy hiệu
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-white/5 text-white/20 cursor-not-allowed py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 mt-2 border border-white/5"
                    >
                      <Lock className="w-4 h-4" />
                      Huy hiệu đang khóa
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Floating Toast Notification Container */}
      <div className="fixed top-6 right-6 z-[160] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(toast => {
            const Icon = toast.badge.icon;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.9, rotateX: -10 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                className="pointer-events-auto glass-panel p-4 flex items-center gap-4 border-l-4 relative overflow-hidden bg-black/95 shadow-2xl border-white/10"
                style={{
                  borderLeftColor: toast.badge.glowColor || '#ff6b00',
                  boxShadow: `0 0 20px -5px ${toast.badge.glowColor || 'rgba(255,107,0,0.5)'}`
                }}
              >
                {/* Neon background effect */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none" />
                
                <div 
                  className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br", toast.badge.gradientClass)}
                  style={{ boxShadow: `0 0 10px ${toast.badge.glowColor}` }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-mono uppercase text-accent font-bold tracking-widest block mb-0.5">Thành tích mới!</span>
                  <h5 className="text-sm font-bold text-white truncate">{toast.badge.title}</h5>
                  <p className="text-[10px] text-white/50 truncate">{toast.badge.description}</p>
                </div>

                <button 
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
