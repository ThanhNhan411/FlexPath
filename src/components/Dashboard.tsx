import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, TrendingUp, Calendar, Trophy, ArrowRight, Activity, Clock, Dumbbell, Trash2, ChevronLeft, Flame } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Workout, ExerciseLog } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  onStartWorkout: () => void;
  onViewAllHistory: () => void;
}

export default function Dashboard({ onStartWorkout, onViewAllHistory }: DashboardProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<{ workout: Workout, logs: ExerciseLog[] } | null>(null);
  const user = auth.currentUser;

  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);

  const hasCompletedWorkoutToday = React.useMemo(() => {
    const today = new Date();
    return workouts.some(w => {
      const d = new Date(w.startTime);
      return d.getDate() === today.getDate() && 
             d.getMonth() === today.getMonth() && 
             d.getFullYear() === today.getFullYear();
    });
  }, [workouts]);

  useEffect(() => {
    async function loadWorkouts() {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'workouts'),
          where('userId', '==', user.uid),
          orderBy('startTime', 'desc')
        );
        const snapshot = await getDocs(q);
        setWorkouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Workout[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadWorkouts();
  }, [user]);

  async function viewDetail(workout: Workout) {
    try {
      const logsSnapshot = await getDocs(collection(db, `workouts/${workout.id}/logs`));
      const logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExerciseLog[];
      setSelectedWorkout({ workout, logs });
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteWorkout(id: string) {
    try {
      await deleteDoc(doc(db, 'workouts', id));
      setWorkouts(workouts.filter(w => w.id !== id));
      if (selectedWorkout?.workout.id === id) setSelectedWorkout(null);
    } catch (e) {
      console.error(e);
    } finally {
      setWorkoutToDelete(null);
    }
  }

  const formatDurationStr = (start: string, end?: string, durationSeconds?: number) => {
    if (durationSeconds !== undefined) {
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      if (mins === 0) return `${secs} giây`;
      return `${mins} phút ${secs > 0 ? secs + 's' : ''}`;
    }
    if (!end) return 'N/A';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(durationMs / 60000);
    return `${mins} phút`;
  };

  const calcTotalTimeHours = () => {
    let totalMs = 0;
    workouts.forEach(w => {
      if (w.endTime) {
        totalMs += new Date(w.endTime).getTime() - new Date(w.startTime).getTime();
      }
    });
    return (totalMs / 3600000).toFixed(1) + 'h';
  };

  const calcTotalVolume = () => {
    let vol = 0;
    workouts.forEach(w => {
      vol += w.totalVolume || 0;
    });
    return (vol / 1000).toFixed(1) + 'T'; // in Tonnes
  };

  const calcTotalCalories = () => {
    let totalCalories = 0;
    workouts.forEach(w => {
      if (w.calories !== undefined) {
        totalCalories += w.calories;
      } else {
        const durMins = (w.duration || 0) / 60;
        totalCalories += Math.round((5.0 * 3.5 * 70 / 200) * durMins);
      }
    });
    return totalCalories.toLocaleString('vi-VN');
  };


  const getBiometricGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      return {
        greeting: "Chào buổi sáng năng lượng",
        sub: "Kích hoạt ngày mới với các chỉ số tối ưu"
      };
    } else if (hour >= 11 && hour < 14) {
      return {
        greeting: "Chào buổi trưa năng suất",
        sub: "Duy trì trạng thái tập trung và nạp năng lượng tốt"
      };
    } else if (hour >= 14 && hour < 18) {
      return {
        greeting: "Chào buổi chiều bứt phá",
        sub: "Thời điểm lý tưởng để vượt qua các mốc PR mới"
      };
    } else if (hour >= 18 && hour < 22) {
      return {
        greeting: "Chào buổi tối hồi phục",
        sub: "Tổng hợp các chỉ số và chuẩn bị tái sinh cơ bắp"
      };
    } else {
      return {
        greeting: "Đêm muộn kiên trì",
        sub: "Sự kiên định trong bóng tối tạo nên nhà vô địch"
      };
    }
  };

  const bioGreeting = React.useMemo(() => getBiometricGreeting(), []);

  const [digitalTime, setDigitalTime] = useState('');
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setDigitalTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const weeklyActivity = React.useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    return days.map(day => {
      const hasWorkout = workouts.some(w => {
        const wDate = new Date(w.startTime);
        wDate.setHours(0, 0, 0, 0);
        return wDate.getTime() === day.getTime();
      });
      return {
        date: day,
        label: day.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }),
        completed: hasWorkout
      };
    });
  }, [workouts]);

  const stats = [
    { 
      label: 'Số buổi tập', 
      value: workouts.length.toString(), 
      icon: Activity, 
      color: 'text-cyan-400', 
      glow: 'hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]',
      bgGlow: 'bg-cyan-500',
      tag: 'SESSIONS'
    },
    { 
      label: 'Thời gian', 
      value: calcTotalTimeHours(), 
      icon: Clock, 
      color: 'text-indigo-400', 
      glow: 'hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]',
      bgGlow: 'bg-indigo-500',
      tag: 'DURATION'
    },
    { 
      label: 'Tổng mức tạ', 
      value: calcTotalVolume(), 
      icon: Dumbbell, 
      color: 'text-orange-400', 
      glow: 'hover:border-orange-500/30 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',
      bgGlow: 'bg-orange-500',
      tag: 'VOLUME'
    },
    { 
      label: 'Calo tiêu thụ', 
      value: calcTotalCalories() + ' kcal', 
      icon: Flame, 
      color: 'text-amber-500', 
      glow: 'hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      bgGlow: 'bg-amber-500',
      tag: 'CALORIES'
    },
  ];

  const recentWorkouts = workouts.slice(0, 3);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">
              {bioGreeting.greeting}, <span className="text-accent">{user?.displayName?.split(' ')[0]}</span>
            </h1>
          </div>
          <p className="text-brand/40 font-mono text-xs uppercase tracking-widest mt-1">{bioGreeting.sub}</p>
        </div>

        <div className="flex items-center gap-4 self-start md:self-auto">
          {/* Holographic Date Display */}
          <div className="hidden sm:flex flex-col items-end px-4 py-2 bg-white/5 rounded-xl border border-white/5 font-mono">
            <span className="text-[9px] uppercase tracking-widest opacity-40">SYS_CLOCK</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-accent">{digitalTime}</span>
              <span className="opacity-20">|</span>
              <span className="text-xs opacity-60">{new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}</span>
            </div>
          </div>

          <button 
            onClick={onStartWorkout}
            className="group flex items-center gap-3 bg-accent text-white px-8 py-4 rounded-2xl font-bold shadow-2xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            Bắt đầu tập luyện
            <div className="w-8 h-px bg-white/30 group-hover:w-12 transition-all" />
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            className={cn(
              "glass-panel p-6 flex items-center justify-between group relative overflow-hidden transition-all duration-300 border border-white/5",
              stat.glow
            )}
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className={cn("p-3 rounded-xl bg-white/5 transition-transform duration-300 group-hover:scale-110", stat.color)}>
                <stat.icon className="w-6 h-6 animate-pulse" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40">{stat.label}</p>
                <p className="text-2xl font-bold font-mono tracking-tighter">{stat.value}</p>
              </div>
            </div>

            <div className="text-right font-mono text-[9px] opacity-20 uppercase tracking-widest relative z-10 select-none">
              {stat.tag}
            </div>

            {/* Glowing bottom line indicator */}
            <div className={cn("absolute bottom-0 left-0 right-0 h-[2px] opacity-20 group-hover:opacity-100 transition-all duration-300", stat.bgGlow)} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Cyberpunk HUD Goal Banner */}
          <div className="glass-panel p-8 relative overflow-hidden group min-h-[280px] flex flex-col justify-between border border-white/5 bg-gradient-to-br from-zinc-950/40 via-ink to-zinc-950/20">
            {/* Ambient grid glow */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
            
            {/* Heartbeat pulse path SVG decoration background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none z-0 flex items-center">
              <svg className="w-full h-24 text-accent" viewBox="0 0 400 100" preserveAspectRatio="none">
                <path 
                  d="M 0 50 L 120 50 L 130 30 L 140 70 L 150 20 L 160 80 L 170 50 L 180 50 L 190 40 L 200 60 L 210 50 L 400 50" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeDasharray="400"
                  strokeDashoffset={hasCompletedWorkoutToday ? "0" : "400"}
                  className={cn("transition-all duration-1000", hasCompletedWorkoutToday ? "" : "animate-[dash_5s_linear_infinite]")}
                />
              </svg>
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 text-accent font-mono text-[10px] uppercase tracking-[0.3em]">
                 <Trophy className="w-4 h-4 text-accent animate-bounce" style={{ animationDuration: '3s' }} />
                 Mục tiêu hàng ngày
              </div>
              
              <div className={cn(
                "px-3 py-1 rounded-full text-[9px] font-mono font-bold tracking-widest border uppercase flex items-center gap-1.5",
                hasCompletedWorkoutToday 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]"
                  : "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", hasCompletedWorkoutToday ? "bg-emerald-400 animate-pulse" : "bg-red-400 animate-ping")} />
                {hasCompletedWorkoutToday ? "Mục tiêu đạt được" : "Chưa hoàn thành"}
              </div>
            </div>

            <div className="relative z-10 my-4">
              <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase mb-4 max-w-md">
                Hoàn thành <span className="text-accent">1 buổi tập</span> hàng ngày
              </h2>
              
              {/* Dual-layer glass progress bar */}
              <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden mb-3 border border-white/5 p-[2px]">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden",
                    hasCompletedWorkoutToday 
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]" 
                      : "bg-gradient-to-r from-accent to-orange-400 shadow-[0_0_15px_rgba(255,107,0,0.3)]"
                  )}
                  style={{ width: hasCompletedWorkoutToday ? '100%' : '8%' }} 
                >
                  {/* Progress diagonal stripe animation */}
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[size:16px_16px] animate-[progressStripe_1s_linear_infinite]" />
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-brand/40 font-mono">
                <span>TIẾN ĐỘ TẬP LUYỆN</span>
                <span>{hasCompletedWorkoutToday ? '1 / 1 BUỔI (100%)' : '0 / 1 BUỔI (0%)'}</span>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/5 text-xs">
              <p className="text-brand/60 font-mono">
                {hasCompletedWorkoutToday 
                  ? '🎉 Bạn đã hoàn thành xuất sắc mục tiêu hôm nay! Hãy nghỉ ngơi và hồi phục.' 
                  : '🔥 Đốt cháy calo ngay bây giờ. Nhấp bắt đầu tập luyện phía trên để khai hỏa!'}
              </p>
            </div>
          </div>

          {/* Biometric Weekly Activity Grid (GitHub-style) */}
          <div className="glass-panel p-6 border border-white/5 bg-zinc-950/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-brand/60 flex items-center gap-2 font-mono">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                Chu kỳ hoạt động sinh học (7 ngày qua)
              </h3>
              <span className="text-[9px] font-mono uppercase text-emerald-400/80 px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                ACTIVE CYCLE
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {weeklyActivity.map((day, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 relative group",
                    day.completed 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]" 
                      : "bg-white/5 border-white/5 text-brand/40 hover:border-white/10"
                  )}
                >
                  <span className="text-[10px] font-mono uppercase tracking-tighter opacity-60 mb-1">
                    {day.label.split(' ')[0]}
                  </span>
                  <span className="text-sm font-mono font-bold">
                    {day.label.split(' ')[1] || day.date.getDate()}
                  </span>
                  
                  {/* Completed status glow indicator */}
                  {day.completed && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-[2px] border-ink animate-pulse" />
                  )}
                  
                  {/* Hover day full date */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-white/10 text-[9px] font-mono text-white rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                    {day.completed ? '🔥 Đã tập luyện' : '💤 Nghỉ ngơi'} ({day.date.toLocaleDateString('vi-VN')})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Workouts */}
        <div className="glass-panel p-6 flex flex-col justify-between border border-white/5">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                Gần đây
              </h3>
              <button onClick={onViewAllHistory} className="text-[10px] uppercase font-mono tracking-widest text-brand/40 hover:text-accent transition-colors">Xem tất cả</button>
            </div>

            <div className="space-y-3 flex-grow">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                ))
              ) : recentWorkouts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center opacity-20">
                  <Dumbbell className="w-10 h-10 mb-2" />
                  <p className="text-[10px] uppercase font-mono">Chưa có dữ liệu</p>
                </div>
              ) : (
                recentWorkouts.map((workout) => (
                  <div 
                    key={workout.id} 
                    onClick={() => viewDetail(workout)}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between group cursor-pointer hover:bg-gradient-to-r hover:from-white/5 hover:to-white/[0.02] hover:-translate-y-[2px]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-[3px] h-8 rounded-full bg-accent opacity-40 group-hover:opacity-100 transition-opacity" />
                      <div>
                        <p className="font-bold text-sm truncate group-hover:text-accent transition-colors">{workout.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                            {new Date(workout.startTime).toLocaleDateString('vi-VN')}
                          </p>
                          <span className="text-[10px] opacity-20">•</span>
                          <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest text-brand/60">
                            {formatDurationStr(workout.startTime, workout.endTime, workout.duration)}
                          </p>
                          <span className="text-[10px] opacity-20">•</span>
                          <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest text-amber-500/80 flex items-center gap-0.5">
                            <Flame className="w-3 h-3 fill-amber-500/20" />
                            {workout.calories !== undefined ? workout.calories : Math.round((5.0 * 3.5 * 70 / 200) * ((workout.duration || 0) / 60))} kcal
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setWorkoutToDelete(workout.id); }}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ArrowRight className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-accent" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <div className="bg-gradient-to-br from-accent/15 via-accent/5 to-transparent p-5 rounded-2xl border border-accent/20 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-accent/10 rounded-full blur-xl group-hover:scale-120 transition-transform duration-500" />
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                <p className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">Mẹo hôm nay từ AI</p>
              </div>
              <p className="text-xs text-brand/70 leading-relaxed italic relative z-10">
                "Nghỉ ngơi 60-90s giữa các hiệp để tối ưu hóa sự phục hồi cơ bắp, hỗ trợ tăng áp suất máu nội mô giúp phì đại sợi cơ (Hypertrophy) hiệu quả nhất."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Overlay */}
      <AnimatePresence>
        {selectedWorkout && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[70] bg-ink flex flex-col md:max-w-xl md:left-auto md:border-l md:border-white/10"
          >
             <header className="absolute top-0 left-0 right-0 p-6 border-b border-white/5 flex items-center justify-between bg-ink/80 backdrop-blur-xl z-20 pt-[calc(1.5rem+env(safe-area-inset-top))]">
                <button 
                  onClick={() => setSelectedWorkout(null)}
                  className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-50 hover:opacity-100"
                >
                   <ChevronLeft className="w-4 h-4" /> Quay lại
                </button>
                <div className="text-right">
                   <h3 className="font-bold text-sm">{selectedWorkout.workout.name}</h3>
                   <p className="text-[10px] opacity-30 font-mono italic">{new Date(selectedWorkout.workout.startTime).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
             </header>

             <div className="flex-grow overflow-y-auto p-6 pt-[calc(6.5rem+env(safe-area-inset-top))] space-y-8 pb-32">
                <div className="grid grid-cols-3 gap-4">
                   <div className="glass-panel p-4 text-center">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-2">Tổng khối lượng</p>
                      <p className="text-xl sm:text-2xl font-bold font-mono tracking-tighter text-accent">{(selectedWorkout.workout.totalVolume || 0).toLocaleString()} <span className="text-xs font-normal opacity-30">KG</span></p>
                   </div>
                   <div className="glass-panel p-4 text-center">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-2">Thời gian tập</p>
                      <p className="text-xl sm:text-2xl font-bold font-mono tracking-tighter">{formatDurationStr(selectedWorkout.workout.startTime, selectedWorkout.workout.endTime, selectedWorkout.workout.duration)}</p>
                   </div>
                   <div className="glass-panel p-4 text-center border-amber-500/20 bg-amber-500/[0.02]">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-amber-500/80 mb-2">Calo</p>
                      <p className="text-xl sm:text-2xl font-bold font-mono tracking-tighter text-amber-400 flex items-center justify-center gap-1">
                        <Flame className="w-4 h-4 fill-amber-500/20 text-amber-500 shrink-0" />
                        {selectedWorkout.workout.calories !== undefined ? selectedWorkout.workout.calories : Math.round((5.0 * 3.5 * 70 / 200) * ((selectedWorkout.workout.duration || 0) / 60))} <span className="text-[10px] font-normal opacity-40">kcal</span>
                      </p>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-brand/40 flex items-center gap-2">
                      <Dumbbell className="w-3 h-3" /> Chi tiết bài tập
                   </h4>
                   <div className="space-y-4">
                      {selectedWorkout.logs.map((log) => (
                        <div key={log.id} className="glass-panel p-4 overflow-hidden">
                           <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4">
                              <h5 className="font-bold text-accent">{log.exerciseName}</h5>
                              {log.calories !== undefined && (
                                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Flame className="w-3 h-3 fill-amber-500/20" />
                                  {log.calories} kcal
                                </span>
                              )}
                            </div>
                           <div className="space-y-2">
                              {log.sets.map((set, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                   <div className="flex items-center gap-4">
                                      <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-mono flex items-center justify-center font-bold">{idx + 1}</span>
                                      <div className="flex items-center gap-4 text-sm font-mono">
                                         <span className="font-bold">{set.weight} <span className="text-[10px] font-normal opacity-30">KG</span></span>
                                         <span className="opacity-20">/</span>
                                         <span className="font-bold">{set.reps} <span className="text-[10px] font-normal opacity-30">REPS</span></span>
                                      </div>
                                   </div>
                                   <div className="text-[10px] opacity-20 uppercase font-mono tracking-tighter">
                                      {(set.weight * set.reps).toLocaleString()} KG Volume
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             
             <div className="p-6 border-t border-white/5 bg-white/5 flex gap-3 mt-auto">
                <button 
                  onClick={() => setSelectedWorkout(null)} 
                  className="w-full py-4 rounded-2xl bg-white/5 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                >
                  Đóng chi tiết
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {workoutToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWorkoutToDelete(null)}
              className="absolute inset-0 bg-ink/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass-panel p-6 border-white/10"
            >
              <h3 className="font-bold text-lg mb-2">Xóa buổi tập?</h3>
              <p className="text-sm text-brand/60 mb-6">Bạn có chắc chắn muốn xóa buổi tập này? Lịch sử tập luyện của buổi này sẽ bị xóa khỏi hệ thống.</p>
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setWorkoutToDelete(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-sm uppercase tracking-widest transition-colors font-mono"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => deleteWorkout(workoutToDelete)}
                  className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/30 font-bold text-sm uppercase tracking-widest transition-colors font-mono"
                >
                  Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

