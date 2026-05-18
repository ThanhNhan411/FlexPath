import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History as HistoryIcon, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Weight, 
  Dumbbell, 
  Trash2,
  ChevronLeft,
  Activity,
  ArrowRight,
  Share2,
  Flame,
  Zap,
  CheckCircle,
  CalendarDays
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Workout, ExerciseLog } from '../types';
import { cn } from '../lib/utils';
import ShareWorkoutModal from './ShareWorkoutModal';

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<{ workout: Workout, logs: ExerciseLog[] } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Streak & Calendar states
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<{ date: Date, workouts: Workout[] } | null>(null);

  const user = auth.currentUser;

  // Streak & Calendar helpers
  const getLocalDateString = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Monday is the first day of the week
    
    const days = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }
    
    const totalDays = lastDay.getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const getStreakStats = () => {
    if (workouts.length === 0) return { current: 0, max: 0 };
    
    const datesSet = new Set<string>();
    workouts.forEach(w => {
      datesSet.add(getLocalDateString(w.startTime));
    });
    
    const sortedDates = Array.from(datesSet).sort();
    
    let maxStreak = 0;
    let tempStreak = 0;
    let prevMs = 0;
    
    sortedDates.forEach((dateStr) => {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      const currentMs = new Date(year, month, day).getTime();
      
      if (prevMs === 0) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((currentMs - prevMs) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak += 1;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
      prevMs = currentMs;
    });
    
    let currentStreak = 0;
    const now = new Date();
    const todayStr = getLocalDateString(now.toISOString());
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday.toISOString());
    
    if (datesSet.has(todayStr)) {
      currentStreak = 1;
      const checkDate = new Date();
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const checkStr = getLocalDateString(checkDate.toISOString());
        if (datesSet.has(checkStr)) {
          currentStreak += 1;
        } else {
          break;
        }
      }
    } else if (datesSet.has(yesterdayStr)) {
      currentStreak = 1;
      const checkDate = new Date();
      checkDate.setDate(now.getDate() - 1);
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const checkStr = getLocalDateString(checkDate.toISOString());
        if (datesSet.has(checkStr)) {
          currentStreak += 1;
        } else {
          break;
        }
      }
    }
    
    return { current: currentStreak, max: maxStreak };
  };

  useEffect(() => {
    loadWorkouts();
  }, [user]);

  async function loadWorkouts() {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'workouts'),
        where('userId', '==', user.uid),
        orderBy('startTime', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Workout[];
      setWorkouts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function viewDetail(workout: Workout) {
    try {
      const logsSnapshot = await getDocs(collection(db, `workouts/${workout.id}/logs`));
      const logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExerciseLog[];
      setSelectedWorkout({ workout, logs });
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteWorkout(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Bạn có muốn xóa buổi tập này không?')) return;
    try {
      await deleteDoc(doc(db, 'workouts', id));
      setWorkouts(workouts.filter(w => w.id !== id));
      if (selectedWorkout?.workout.id === id) setSelectedWorkout(null);
    } catch (e) {
      console.error(e);
    }
  }

  const formatDuration = (start: string, end?: string, durationSeconds?: number) => {
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic tracking-tight uppercase">Lịch sử tập luyện</h2>
          <p className="text-brand/40 font-mono text-xs uppercase tracking-widest mt-1">Ghi lại hành trình nỗ lực của bạn</p>
        </div>

        {/* Toggle Switch Pill */}
        {!loading && workouts.length > 0 && (
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all",
                viewMode === 'list' 
                  ? "bg-accent text-white shadow-lg shadow-accent/20" 
                  : "text-white/40 hover:text-white/80"
              )}
            >
              <HistoryIcon className="w-3.5 h-3.5" /> Danh sách
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all",
                viewMode === 'calendar' 
                  ? "bg-accent text-white shadow-lg shadow-accent/20" 
                  : "text-white/40 hover:text-white/80"
              )}
            >
              <Calendar className="w-3.5 h-3.5" /> Lịch tháng
            </button>
          </div>
        )}
      </header>

      {/* STREAK DASHBOARD BANNER */}
      {!loading && workouts.length > 0 && (() => {
        const stats = getStreakStats();
        const hasWorkedOutToday = workouts.some(w => getLocalDateString(w.startTime) === getLocalDateString(new Date().toISOString()));
        
        // Calculate last 7 days checkmark list
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = getLocalDateString(d.toISOString());
          const hasWorkout = workouts.some(w => getLocalDateString(w.startTime) === dateStr);
          last7Days.push({
            label: d.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('Th ', 'T'),
            hasWorkout,
            isToday: i === 0,
            dateStr
          });
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Streak Card */}
            <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between border border-amber-500/20 group hover:border-amber-500/40 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-amber-500/10 transition-all" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/30">Chuỗi hiện tại</p>
                  <p className="text-3xl font-black font-mono tracking-tighter text-amber-400 mt-1 flex items-baseline gap-1">
                    {stats.current} <span className="text-xs font-normal text-white/40">NGÀY</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 animate-pulse">
                  <Flame className="w-5 h-5 fill-amber-400/20" />
                </div>
              </div>
              <p className="text-[10px] text-white/50 mt-4 leading-relaxed font-sans">
                {hasWorkedOutToday 
                  ? "🔥 Hôm nay đã giữ lửa thành công! Tuyệt vời!"
                  : "⚡ Tập luyện ngay hôm nay để duy trì chuỗi liên tục!"}
              </p>
            </div>

            {/* Max Streak Card */}
            <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between border border-purple-500/20 group hover:border-purple-500/40 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-purple-500/10 transition-all" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/30">Kỷ lục chuỗi</p>
                  <p className="text-3xl font-black font-mono tracking-tighter text-purple-400 mt-1 flex items-baseline gap-1">
                    {stats.max} <span className="text-xs font-normal text-white/40">NGÀY</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Zap className="w-5 h-5 fill-purple-400/20" />
                </div>
              </div>
              <p className="text-[10px] text-white/50 mt-4 leading-relaxed font-sans">
                💪 Giới hạn sinh ra là để bị phá vỡ. Tiếp tục bứt phá nào!
              </p>
            </div>

            {/* Last 7 Days Activity Checklist */}
            <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between border border-white/5 group transition-all duration-300">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-3">Hiệu suất 7 ngày qua</p>
                <div className="flex justify-between gap-1.5">
                  {last7Days.map((day, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className={cn(
                        "text-[9px] font-mono font-bold",
                        day.isToday ? "text-accent" : "opacity-30"
                      )}>{day.label}</span>
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-all border",
                        day.hasWorkout 
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-500/5" 
                          : day.isToday
                            ? "bg-white/5 border-dashed border-white/20 text-white/30"
                            : "bg-white/2 border-white/5 text-white/10"
                      )}>
                        {day.hasWorkout ? (
                          <CheckCircle className="w-4 h-4 fill-emerald-500/10" />
                        ) : (
                          <span className="text-[8px] font-mono font-bold opacity-30">•</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-20 animate-pulse">
           <HistoryIcon className="w-12 h-12 mb-4" />
           <p className="text-sm font-mono uppercase tracking-[0.3em]">Đang tải dữ liệu...</p>
        </div>
      ) : workouts.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center gap-4 border-dashed border-2">
          <HistoryIcon className="w-12 h-12 opacity-10" />
          <div>
            <p className="font-bold opacity-40 uppercase tracking-widest text-xs">Chưa có lịch sử tập luyện</p>
            <p className="text-[10px] text-brand/30 mt-2">Bắt đầu buổi tập đầu tiên của bạn ngay hôm nay!</p>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="space-y-6">
          {/* Calendar Box */}
          <div className="glass-panel p-6 border border-white/10 relative overflow-hidden">
            {/* Header: Month Selector */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => {
                  const prev = new Date(currentMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  setCurrentMonth(prev);
                }}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 active:scale-95 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="font-black font-mono text-base uppercase tracking-wider text-white">
                Tháng {String(currentMonth.getMonth() + 1).padStart(2, '0')}, {currentMonth.getFullYear()}
              </h3>
              <button 
                onClick={() => {
                  const next = new Date(currentMonth);
                  next.setMonth(next.getMonth() + 1);
                  setCurrentMonth(next);
                }}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 active:scale-95 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Names */}
            <div className="grid grid-cols-7 gap-2 text-center mb-2">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((wName, idx) => (
                <div key={idx} className="text-[10px] font-mono font-bold uppercase opacity-30 py-1 text-white">
                  {wName}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth(currentMonth).map((dayObj, idx) => {
                const dateStr = getLocalDateString(dayObj.date.toISOString());
                const dayWorkouts = workouts.filter(w => getLocalDateString(w.startTime) === dateStr);
                const hasWorkouts = dayWorkouts.length > 0;
                
                const isToday = getLocalDateString(new Date().toISOString()) === dateStr;
                const isSelected = selectedDateWorkouts && getLocalDateString(selectedDateWorkouts.date.toISOString()) === dateStr;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDateWorkouts({ date: dayObj.date, workouts: dayWorkouts });
                    }}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-between p-1.5 transition-all relative border",
                      !dayObj.isCurrentMonth && "opacity-20",
                      hasWorkouts 
                        ? isSelected 
                          ? "bg-accent border-accent text-white shadow-lg shadow-accent/30" 
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                        : isToday
                          ? "border-accent/40 bg-accent/5 text-accent"
                          : isSelected
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-white/2 border-white/5 text-white/60 hover:bg-white/5"
                    )}
                  >
                    {/* Day number */}
                    <span className="text-[10px] font-mono font-bold self-start">{dayObj.date.getDate()}</span>
                    
                    {/* Workout Indicator icon */}
                    {hasWorkouts && (
                      <div className="relative flex items-center justify-center mt-1">
                        <Dumbbell className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "text-emerald-400")} />
                        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Workouts List */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-brand/40 flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-accent" />
              {selectedDateWorkouts 
                ? `Buổi tập ngày ${selectedDateWorkouts.date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}`
                : "Chọn một ngày để xem chi tiết tập luyện"
              }
            </h4>

            {selectedDateWorkouts && selectedDateWorkouts.workouts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {selectedDateWorkouts.workouts.map((workout) => (
                  <div 
                    key={workout.id}
                    onClick={() => viewDetail(workout)}
                    className="glass-panel p-6 group hover:border-accent/40 active:scale-[0.99] transition-all cursor-pointer relative"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                          <Activity className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg group-hover:text-accent transition-colors">{workout.name}</h3>
                          <div className="flex items-center gap-4 mt-1 opacity-40">
                             <div className="flex items-center gap-1 text-[10px] uppercase font-mono">
                               <Clock className="w-3 h-3" />
                               {formatDuration(workout.startTime, workout.endTime, workout.duration)}
                             </div>
                             <div className="flex items-center gap-1 text-[10px] uppercase font-mono">
                               <Weight className="w-3.5 h-3.5" />
                               {(workout.totalVolume || 0).toLocaleString()} KG
                             </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                         <div className="text-right">
                            <p className="text-[10px] font-mono uppercase opacity-30 tracking-widest">Xem chi tiết</p>
                            <p className="text-xs font-bold font-mono tracking-tighter text-accent flex items-center gap-1 mt-0.5">
                              CHI TIẾT <ArrowRight className="w-3.5 h-3.5" />
                            </p>
                         </div>
                         <div className="flex gap-2">
                            <button 
                              onClick={(e) => deleteWorkout(workout.id, e)}
                              className="p-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedDateWorkouts ? (
              <div className="glass-panel p-8 text-center text-white/40 text-xs font-mono uppercase tracking-widest">
                Không có buổi tập nào diễn ra trong ngày này.
              </div>
            ) : (
              <div className="glass-panel p-8 text-center text-white/30 text-xs font-mono uppercase tracking-widest border-dashed border-2">
                Hãy click vào một ngày có màu xanh lá trên lịch để xem các buổi tập đã hoàn thành!
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {workouts.map((workout) => (
              <motion.div 
                layout
                key={workout.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => viewDetail(workout)}
                className="glass-panel p-6 group hover:border-accent/40 active:scale-[0.99] transition-all cursor-pointer relative"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                      <Activity className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-accent transition-colors">{workout.name}</h3>
                      <div className="flex items-center gap-4 mt-1 opacity-40">
                         <div className="flex items-center gap-1 text-[10px] uppercase font-mono">
                           <Calendar className="w-3 h-3" />
                           {new Date(workout.startTime).toLocaleDateString('vi-VN')}
                         </div>
                         <div className="flex items-center gap-1 text-[10px] uppercase font-mono">
                           <Clock className="w-3 h-3" />
                           {formatDuration(workout.startTime, workout.endTime, workout.duration)}
                         </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                     <div className="text-right">
                        <p className="text-[10px] font-mono uppercase opacity-30 tracking-widest">Khối lượng</p>
                        <p className="text-lg font-bold font-mono tracking-tighter">{(workout.totalVolume || 0).toLocaleString()} <span className="text-[10px] font-normal opacity-40 ml-0.5">KG</span></p>
                     </div>
                     <div className="flex gap-2">
                        <button 
                          onClick={(e) => deleteWorkout(workout.id, e)}
                          className="p-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="p-3 bg-white/5 rounded-xl group-hover:bg-accent group-hover:text-white transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                     </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Overlay */}
      <AnimatePresence>
        {selectedWorkout && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[70] bg-ink flex flex-col md:max-w-xl md:left-auto md:border-l md:border-white/10"
          >
             <header className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-ink/80 backdrop-blur-xl z-20 pt-[calc(1.5rem+env(safe-area-inset-top))]">
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

             <div className="flex-grow overflow-y-auto p-6 space-y-8 pb-32">
                <div className="grid grid-cols-2 gap-4">
                   <div className="glass-panel p-6 text-center">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-2">Tổng khối lượng</p>
                      <p className="text-3xl font-bold font-mono tracking-tighter text-accent">{(selectedWorkout.workout.totalVolume || 0).toLocaleString()} <span className="text-xs font-normal opacity-30">KG</span></p>
                   </div>
                   <div className="glass-panel p-6 text-center">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-2">Thời gian tập</p>
                      <p className="text-3xl font-bold font-mono tracking-tighter">{formatDuration(selectedWorkout.workout.startTime, selectedWorkout.workout.endTime, selectedWorkout.workout.duration)}</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-brand/40 flex items-center gap-2">
                      <Dumbbell className="w-3 h-3" /> Chi tiết bài tập
                   </h4>
                   <div className="space-y-4">
                      {selectedWorkout.logs.map((log) => (
                        <div key={log.id} className="glass-panel p-4 overflow-hidden">
                           <h5 className="font-bold text-accent mb-4 border-b border-white/5 pb-2">{log.exerciseName}</h5>
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
             
             <div className="p-6 border-t border-white/5 bg-ink flex gap-3 mt-auto font-sans pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-20 sticky bottom-0">
                <button 
                  onClick={() => setShowShareModal(true)} 
                  className="flex-1 py-4 rounded-2xl bg-accent text-white hover:bg-accent/90 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-accent/20"
                >
                  <Share2 className="w-4 h-4" /> Chia sẻ ảnh
                </button>
                <button 
                  onClick={() => setSelectedWorkout(null)} 
                  className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  Đóng chi tiết
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Photo Modal */}
      <AnimatePresence>
        {showShareModal && selectedWorkout && (
          <ShareWorkoutModal 
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            workout={selectedWorkout.workout}
            logs={selectedWorkout.logs}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
