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
import { 
  Badge, 
  BADGES, 
  calculateAchievementStats, 
  getBadgeProgress as getBadgeProgressHelper, 
  isBadgeUnlocked as isBadgeUnlockedHelper 
} from '../lib/achievements';

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
    return calculateAchievementStats(workouts);
  }, [workouts]);

  // Check achievement progress
  const getBadgeProgress = (badge: Badge) => {
    return getBadgeProgressHelper(badge, stats);
  };

  const isBadgeUnlocked = (badgeId: string) => {
    return isBadgeUnlockedHelper(badgeId, unlockedBadges, stats);
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
                      "w-24 h-24 flex items-center justify-center transition-all relative shrink-0",
                      badge.imageUrl 
                        ? "rounded-full" 
                        : (unlocked ? cn("rounded-2xl bg-gradient-to-br text-white", badge.gradientClass) : "rounded-2xl bg-white/5 text-white/20")
                    )}
                    style={{
                      boxShadow: unlocked && !badge.imageUrl ? `0 0 20px ${badge.glowColor}` : 'none',
                      filter: unlocked && badge.imageUrl ? `drop-shadow(0 0 8px ${badge.glowColor})` : 'none'
                    }}
                  >
                    {badge.imageUrl ? (
                      <img src={badge.imageUrl} alt={badge.title} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      Icon && <Icon className="w-12 h-12" />
                    )}
                    {!unlocked && (
                      <div className="absolute -bottom-1.5 -right-1.5 bg-ink/90 p-1 rounded-full border border-white/10 z-10">
                        <Lock className="w-5 h-5 text-white/40" />
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
                      "w-24 h-24 flex items-center justify-center transition-all relative shrink-0",
                      badge.imageUrl 
                        ? "rounded-full" 
                        : (unlocked ? cn("rounded-2xl bg-gradient-to-br text-white", badge.gradientClass) : "rounded-2xl bg-white/5 text-white/20")
                    )}
                    style={{
                      boxShadow: unlocked && !badge.imageUrl ? `0 0 20px ${badge.glowColor}` : 'none',
                      filter: unlocked && badge.imageUrl ? `drop-shadow(0 0 8px ${badge.glowColor})` : 'none'
                    }}
                  >
                    {badge.imageUrl ? (
                      <img src={badge.imageUrl} alt={badge.title} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      Icon && <Icon className="w-12 h-12" />
                    )}
                    {!unlocked && (
                      <div className="absolute -bottom-1.5 -right-1.5 bg-ink/90 p-1 rounded-full border border-white/10 z-10">
                        <Lock className="w-5 h-5 text-white/40" />
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
                      "w-40 h-40 flex items-center justify-center relative shrink-0",
                      selectedBadge.imageUrl 
                        ? "rounded-full" 
                        : (unlocked ? cn("rounded-[2rem] bg-gradient-to-br text-white", selectedBadge.gradientClass) : "rounded-[2rem] bg-white/5 text-white/20")
                    )}
                    style={{
                      boxShadow: unlocked && !selectedBadge.imageUrl ? `0 0 30px ${selectedBadge.glowColor}` : 'none',
                      filter: unlocked && selectedBadge.imageUrl ? `drop-shadow(0 0 12px ${selectedBadge.glowColor})` : 'none'
                    }}
                  >
                    {selectedBadge.imageUrl ? (
                      <img src={selectedBadge.imageUrl} alt={selectedBadge.title} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      Icon && <Icon className="w-20 h-20" />
                    )}
                    {!unlocked && <Lock className="absolute w-10 h-10 text-white/40 z-10" />}
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
                  className={cn(
                    "w-20 h-20 flex items-center justify-center text-white shrink-0",
                    toast.badge.imageUrl 
                      ? "rounded-full" 
                      : cn("rounded-2xl bg-gradient-to-br", toast.badge.gradientClass)
                  )}
                  style={{
                    boxShadow: !toast.badge.imageUrl ? `0 0 10px ${toast.badge.glowColor}` : 'none',
                    filter: toast.badge.imageUrl ? `drop-shadow(0 0 6px ${toast.badge.glowColor})` : 'none'
                  }}
                >
                  {toast.badge.imageUrl ? (
                    <img src={toast.badge.imageUrl} alt={toast.badge.title} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    Icon && <Icon className="w-10 h-10" />
                  )}
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
