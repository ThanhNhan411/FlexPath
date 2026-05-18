import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  Plus, 
  Check, 
  Timer as TimerIcon, 
  Play, 
  Pause, 
  RefreshCcw,
  Dumbbell,
  ChevronDown,
  Search,
  Filter,
  Info
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { ExerciseLog, Exercise, WorkoutTemplate } from '../types';
import { ExerciseAnimation } from './ExerciseAnimation';

interface ActiveWorkoutProps {
  onClose: () => void;
  onComplete: () => void;
  exercises: Exercise[];
  initialTemplate?: WorkoutTemplate | null;
  minimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
}

export default function ActiveWorkout({ onClose, onComplete, exercises, initialTemplate, minimized, onMinimize, onRestore }: ActiveWorkoutProps) {
  const [sessionTime, setSessionTime] = useState(() => {
    try {
      const saved = localStorage.getItem('activeWorkoutState');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp && !parsed.paused) {
          return parsed.sessionTime + Math.floor((Date.now() - parsed.timestamp) / 1000);
        }
        return parsed.sessionTime || 0;
      }
    } catch (e) {}
    return 0;
  });
  const [startTime, setStartTime] = useState(() => {
    try {
      const saved = localStorage.getItem('activeWorkoutState');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.startTime || new Date().toISOString();
      }
    } catch(e) {}
    return new Date().toISOString();
  });
  const [paused, setPaused] = useState(() => {
    try {
      const saved = localStorage.getItem('activeWorkoutState');
      if (saved) return JSON.parse(saved).paused || false;
    } catch (e) {}
    return false;
  });
  const [logs, setLogs] = useState<ExerciseLog[]>(() => {
    try {
      const saved = localStorage.getItem('activeWorkoutState');
      if (saved && JSON.parse(saved).logs?.length > 0) return JSON.parse(saved).logs;
    } catch (e) {}
    return [];
  });
  
  useEffect(() => {
    localStorage.setItem('activeWorkoutState', JSON.stringify({
      sessionTime,
      startTime,
      paused,
      logs,
      initialTemplate,
      timestamp: Date.now()
    }));
  }, [sessionTime, startTime, paused, logs, initialTemplate]);

  const removeWorkoutState = () => {
    localStorage.removeItem('activeWorkoutState');
  };
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(() => {
    try {
      const saved = localStorage.getItem('defaultRestDuration');
      return saved ? parseInt(saved, 10) : 60;
    } catch (e) {
      return 60;
    }
  }); 

  useEffect(() => {
    localStorage.setItem('defaultRestDuration', restDuration.toString());
  }, [restDuration]);

  const [isFinishing, setIsFinishing] = useState(false);

  const [isPickingExercise, setIsPickingExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [displayLimit, setDisplayLimit] = useState(24);
  const [showPickerFilters, setShowPickerFilters] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const filterOptions = useMemo(() => {
    if (!exercises) return { muscles: [], equipments: [], levels: [] };
    return {
      muscles: Array.from(new Set(exercises.flatMap(ex => ex.primaryMuscles || []))).filter(Boolean).sort(),
      equipments: Array.from(new Set(exercises.map(ex => ex.equipment).filter(Boolean))).sort(),
      levels: Array.from(new Set(exercises.map(ex => ex.level).filter(Boolean))).sort(),
    };
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter(ex => {
      const matchesSearch = (ex.name || '').toLowerCase().includes(exerciseSearch.toLowerCase());
      const matchesMuscle = selectedMuscle === 'All' || (ex.primaryMuscles && ex.primaryMuscles.includes(selectedMuscle));
      const matchesEquipment = selectedEquipment === 'All' || ex.equipment === selectedEquipment;
      const matchesLevel = selectedLevel === 'All' || ex.level === selectedLevel;
      
      return matchesSearch && matchesMuscle && matchesEquipment && matchesLevel;
    });
  }, [exerciseSearch, selectedMuscle, selectedEquipment, selectedLevel, exercises]);

  // Reset limit when searching or filtering
  useEffect(() => {
    setDisplayLimit(24);
  }, [exerciseSearch, selectedMuscle, selectedEquipment, selectedLevel]);

  const hasInitializedTemplate = useRef(false);

  // Handle template initialization
  useEffect(() => {
    if (initialTemplate && logs.length === 0 && !hasInitializedTemplate.current) {
      hasInitializedTemplate.current = true;
      const templateLogs: ExerciseLog[] = initialTemplate.exercises.map((te, idx) => {
        const exercise = exercises.find(e => e.id === te.exerciseId);
        return {
          id: Math.random().toString(36).substr(2, 9),
          exerciseId: te.exerciseId,
          exerciseName: te.exerciseName,
          order: idx,
          sets: Array.from({ length: te.sets }).map(() => ({
            reps: te.reps,
            weight: 0,
            completed: false,
            timestamp: new Date().toISOString()
          }))
        };
      });
      setLogs(templateLogs);
    }
  }, [initialTemplate, exercises]);

  const visibleExercises = filteredExercises.slice(0, displayLimit);

  useEffect(() => {
    let interval: any;
    if (!paused) {
      interval = setInterval(() => setSessionTime(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    let interval: any;
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => setRestTimer(t => (t !== null ? t - 1 : null)), 1000);
    } else if (restTimer === 0) {
      setRestTimer(null);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const resetPickerFilters = () => {
    setSelectedMuscle('All');
    setSelectedEquipment('All');
    setSelectedLevel('All');
    setExerciseSearch('');
  };

  const addExercise = (exercise: Exercise) => {
    const newLog: ExerciseLog = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      order: logs.length,
      sets: [{ reps: 10, weight: 0, completed: false, timestamp: new Date().toISOString() }]
    };
    setLogs([...logs, newLog]);
    setIsPickingExercise(false);
    setPreviewExercise(null);
    setExerciseSearch('');
    setSelectedMuscle('All');
    setSelectedEquipment('All');
    setSelectedLevel('All');
  };

  const finishWorkout = async () => {
    if (!auth.currentUser) return;
    setIsFinishing(true);

    try {
      const workoutRef = await addDoc(collection(db, 'workouts'), {
        userId: auth.currentUser.uid,
        name: `Buổi tập ${new Date().toLocaleDateString('vi-VN')}`,
        startTime,
        endTime: new Date().toISOString(),
        duration: sessionTime,
        status: 'completed',
        totalVolume: logs.reduce((acc, log) => acc + log.sets.reduce((sAcc, s) => sAcc + (s.completed ? s.reps * s.weight : 0), 0), 0)
      });

      for (const log of logs) {
        await addDoc(collection(db, `workouts/${workoutRef.id}/logs`), {
          ...log,
          sets: log.sets.filter(s => s.completed)
        });
      }
      removeWorkoutState();
      onComplete();
    } catch (e) {
      console.error(e);
      setIsFinishing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
      <>
        <motion.div 
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          className={cn("fixed inset-0 z-[60] bg-ink flex flex-col", minimized && "hidden")}
        >
          <header className="absolute top-0 left-0 right-0 p-6 border-b border-white/5 flex items-center justify-between bg-ink/50 backdrop-blur-xl z-10 pt-[calc(1.5rem+env(safe-area-inset-top))]">
            <div className="flex items-center gap-4">
              <button onClick={onMinimize} className="opacity-50 hover:opacity-100 transition-opacity">
                <ChevronDown className="w-6 h-6" />
              </button>
              <button onClick={() => setShowCancelConfirm(true)} className="text-red-500/50 hover:text-red-500 transition-opacity text-xs font-mono uppercase tracking-widest">
                Hủy
              </button>
            </div>
            <div className="text-center absolute left-1/2 -translate-x-1/2">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">Đang Tập</h3>
          <span className={cn("text-2xl font-bold font-mono tracking-tighter", paused && "opacity-40 animate-pulse")}>
            {formatTime(sessionTime)}
          </span>
        </div>
        <button 
          onClick={finishWorkout}
          disabled={isFinishing || logs.length === 0}
          className="bg-accent text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-accent/20 disabled:opacity-30"
        >
          {isFinishing ? 'Đang Lưu...' : 'Xong'}
        </button>
      </header>

      <div className="flex-grow overflow-y-auto p-4 pt-[calc(6.5rem+env(safe-area-inset-top))] space-y-6 pb-40">
        <div className="glass-panel p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-accent/20">
          <div className="flex items-center gap-3">
            <TimerIcon className="w-5 h-5 text-accent" />
            <span className="text-xs uppercase font-mono tracking-widest text-brand/60">Thời gian nghỉ mặc định</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setRestDuration(Math.max(0, restDuration - 15))}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <span className="font-mono font-bold text-sm">-15s</span>
            </button>
            <span className="font-mono font-bold text-lg min-w-[3rem] text-center">{restDuration}s</span>
            <button 
              onClick={() => setRestDuration(restDuration + 15)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <span className="font-mono font-bold text-sm">+15s</span>
            </button>
          </div>
        </div>

        {logs.map((log) => (
          <div key={log.id} className="glass-panel overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-accent" />
                <h4 className="font-bold text-lg">{log.exerciseName}</h4>
              </div>
              <button 
                onClick={() => setLogs(logs.filter(l => l.id !== log.id))}
                className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-4 text-center opacity-40 text-[10px] font-mono uppercase">
                <div>Set</div>
                <div>Kg</div>
                <div>Reps</div>
                <div>Xong</div>
              </div>

              <div className="space-y-2">
                {log.sets.map((set, idx) => (
                  <div key={idx} className={cn("grid grid-cols-4 items-center gap-2 p-2 rounded-lg transition-colors", set.completed ? "bg-accent/10" : "bg-white/5")}>
                    <div className="text-center font-mono text-sm opacity-50">{idx + 1}</div>
                    <input 
                      type="number"
                      className="bg-transparent text-center font-bold focus:outline-none"
                      value={set.weight}
                      onChange={(e) => {
                        const newLogs = [...logs];
                        const lIdx = newLogs.findIndex(l => l.id === log.id);
                        newLogs[lIdx].sets[idx].weight = Number(e.target.value);
                        setLogs(newLogs);
                      }}
                    />
                    <input 
                      type="number"
                      className="bg-transparent text-center font-bold focus:outline-none"
                      value={set.reps}
                      onChange={(e) => {
                        const newLogs = [...logs];
                        const lIdx = newLogs.findIndex(l => l.id === log.id);
                        newLogs[lIdx].sets[idx].reps = Number(e.target.value);
                        setLogs(newLogs);
                      }}
                    />
                    <div className="flex justify-center">
                      <button 
                        onClick={() => {
                            const newLogs = [...logs];
                            const lIdx = newLogs.findIndex(l => l.id === log.id);
                            const wasCompleted = newLogs[lIdx].sets[idx].completed;
                            newLogs[lIdx].sets[idx].completed = !wasCompleted;
                            if (!wasCompleted && restDuration > 0) setRestTimer(restDuration);
                            setLogs(newLogs);
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                          set.completed ? "bg-accent text-white" : "bg-white/10 text-transparent"
                        )}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => {
                    const newLogs = [...logs];
                    const lIdx = newLogs.findIndex(l => l.id === log.id);
                    const lastSet = newLogs[lIdx].sets[newLogs[lIdx].sets.length - 1];
                    newLogs[lIdx].sets.push({ 
                        reps: lastSet?.reps || 0, 
                        weight: lastSet?.weight || 0, 
                        completed: false, 
                        timestamp: new Date().toISOString() 
                    });
                    setLogs(newLogs);
                }}
                className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-3 h-3" /> Thêm Set
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={() => setIsPickingExercise(true)}
          className="w-full py-8 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center gap-3 text-brand/40 hover:text-accent hover:border-accent/40 transition-all"
        >
          <Plus className="w-6 h-6" />
          <span className="font-bold uppercase tracking-widest text-xs">Thêm Bài Tập</span>
        </button>
      </div>

      <AnimatePresence>
        {isPickingExercise && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPickingExercise(false)}
              className="absolute inset-0 bg-ink/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-xl h-[85vh] flex flex-col relative overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Thêm Bài Tập</h3>
                  <button onClick={() => setIsPickingExercise(false)}><X className="w-5 h-5 opacity-50" /></button>
                </div>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input 
                      type="text"
                      className="w-full bg-ink/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-accent/40"
                      placeholder="Tìm bài tập..."
                      value={exerciseSearch}
                      onChange={e => setExerciseSearch(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setShowPickerFilters(!showPickerFilters)}
                    className={cn(
                      "px-4 rounded-xl border transition-all flex items-center gap-2",
                      showPickerFilters ? "bg-accent border-accent text-white" : "bg-white/5 border-white/10 text-brand/60"
                    )}
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                </div>

                <AnimatePresence>
                  {showPickerFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 mb-4 p-4 bg-ink/20 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Bộ lọc</span>
                          <button onClick={resetPickerFilters} className="text-[10px] uppercase font-mono tracking-widest text-accent">Xoá lọc</button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] opacity-40 uppercase mb-1">Nhóm cơ</p>
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                              <button
                                onClick={() => setSelectedMuscle('All')}
                                className={cn("whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-mono border transition-all", selectedMuscle === 'All' ? "bg-accent border-accent text-white" : "bg-white/5 border-white/10 text-brand/60")}
                              >
                                All
                              </button>
                              {filterOptions.muscles.map(m => (
                                <button
                                  key={m}
                                  onClick={() => setSelectedMuscle(m)}
                                  className={cn("whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-mono border transition-all", selectedMuscle === m ? "bg-accent border-accent text-white" : "bg-white/5 border-white/10 text-brand/60")}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] opacity-40 uppercase mb-1">Dụng cụ</p>
                              <select 
                                value={selectedEquipment}
                                onChange={e => setSelectedEquipment(e.target.value)}
                                className="w-full bg-ink/40 border border-white/10 rounded-lg py-1.5 px-2 text-[10px] focus:outline-none"
                              >
                                <option value="All">Tất cả dụng cụ</option>
                                {filterOptions.equipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                              </select>
                            </div>
                            <div>
                              <p className="text-[10px] opacity-40 uppercase mb-1">Độ khó</p>
                              <select 
                                value={selectedLevel}
                                onChange={e => setSelectedLevel(e.target.value)}
                                className="w-full bg-ink/40 border border-white/10 rounded-lg py-1.5 px-2 text-[10px] focus:outline-none"
                              >
                                <option value="All">Tất cả độ khó</option>
                                {filterOptions.levels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-brand/30">
                    Kết quả: <span className="text-accent">{filteredExercises.length}</span>
                  </p>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-2">
                {visibleExercises.map((ex) => (
                  <button 
                    key={ex.id}
                    onClick={() => setPreviewExercise(ex)}
                    className="w-full p-4 rounded-xl bg-white/5 hover:bg-accent/10 transition-all flex items-center justify-between group border border-white/5 hover:border-accent/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-lg overflow-hidden flex items-center justify-center">
                        <img 
                          src={ex.gifUrl || (ex.images && ex.images[0])} 
                          onError={(e) => {
                            const t = e.currentTarget;
                            if (t.src.indexOf('placehold.co') > -1) return;
                            t.src = "https://placehold.co/100x100/18181b/6366f1?text=" + encodeURIComponent(ex.name[0]);
                          }}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100" 
                        />
                      </div>
                      <div>
                        <span className="font-bold block capitalize group-hover:text-accent transition-colors">{ex.name}</span>
                        <span className="text-[10px] uppercase font-mono opacity-50">{(ex.primaryMuscles || []).join(', ')}</span>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 opacity-20 group-hover:opacity-100 transition-all" />
                  </button>
                ))}

                {displayLimit < filteredExercises.length && (
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 24)}
                    className="w-full py-4 text-[10px] font-mono uppercase tracking-widest text-brand/40 hover:text-accent transition-colors"
                  >
                    Xem thêm ({filteredExercises.length - displayLimit})
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewExercise && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewExercise(null)}
              className="absolute inset-0 bg-ink/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-xl h-[85vh] flex flex-col relative overflow-hidden"
            >
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div>
                         <h3 className="text-2xl font-bold capitalize">{previewExercise.name}</h3>
                         <p className="text-[10px] font-mono uppercase tracking-widest text-accent mt-1">{(previewExercise.primaryMuscles || []).join(' • ')}</p>
                    </div>
                    <button onClick={() => setPreviewExercise(null)} className="p-2 opacity-50 hover:opacity-100"><X /></button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative group isolate">
                      <ExerciseAnimation 
                        exercise={previewExercise}
                        className="w-full h-full object-contain relative z-10"
                      />
                      <div className="absolute inset-0 bg-accent/5 mix-blend-overlay" />
                      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-ink/80 backdrop-blur px-3 py-1 rounded-full z-20 border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span className="text-[10px] font-bold uppercase font-mono tracking-widest text-white/80">
                          {previewExercise.gifUrl ? 'Video Minh Họa' : (previewExercise.images && previewExercise.images.length > 1 ? 'Chuyển Động' : 'Ảnh Minh Họa')}
                        </span>
                      </div>
                    </div>

                    {previewExercise.images && previewExercise.images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {previewExercise.images.map((img, i) => (
                          <div 
                            key={i}
                            className="w-16 aspect-square flex-shrink-0 bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                          >
                            <img src={img} alt={`Step ${i}`} className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] font-mono uppercase opacity-40 mb-1">Cơ mục tiêu</p>
                      <p className="font-bold capitalize">{(previewExercise.primaryMuscles || []).join(', ')}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] font-mono uppercase opacity-40 mb-1">Dụng cụ</p>
                      <p className="font-bold capitalize">{previewExercise.equipment || 'No equipment'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                      <Info className="w-4 h-4 text-accent" /> Hướng dẫn tập luyện
                    </h4>
                    <div className="space-y-4">
                      {(previewExercise.instructions || []).map((step, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-accent font-bold font-mono">{(idx + 1).toString().padStart(2, '0')}</span>
                          <p className="text-brand/70 text-sm leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-white/5">
                  <button 
                    onClick={() => addExercise(previewExercise)}
                    className="w-full py-4 rounded-xl bg-accent text-white font-bold shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Thêm Vào Buổi Tập
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-ink to-transparent pointer-events-none">
        <div className="max-w-md mx-auto flex items-center justify-center pointer-events-auto">
          <button 
            onClick={() => setPaused(!paused)}
            className="w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/20 hover:scale-110 transition-transform"
          >
            {paused ? <Play className="w-6 h-6 text-white fill-white" /> : <Pause className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Rest Timer */}
      <AnimatePresence>
        {restTimer !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] w-full max-w-[240px]"
          >
            <div className="glass-panel p-4 bg-accent text-white text-center shadow-2xl shadow-accent/50">
              <p className="text-[10px] font-mono uppercase opacity-80 mb-2">Nghỉ Ngơi</p>
              
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => setRestTimer(t => Math.max(1, (t || 0) - 15))}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0"
                >
                  <span className="font-mono font-bold text-sm">-15s</span>
                </button>
                
                <h4 className="text-4xl font-bold font-mono min-w-[80px] tabular-nums">{restTimer}s</h4>

                <button 
                  onClick={() => setRestTimer(t => (t || 0) + 15)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0"
                >
                  <span className="font-mono font-bold text-sm">+15s</span>
                </button>
              </div>

              <button 
                onClick={() => setRestTimer(null)}
                className="mt-3 text-[10px] font-bold uppercase underline underline-offset-4 opacity-80 hover:opacity-100"
              >
                Bỏ Qua
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        </motion.div>

        {minimized && (
          <div 
            onClick={onRestore}
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[90] w-16 h-16 bg-ink text-white rounded-full shadow-2xl flex flex-col items-center justify-center cursor-pointer border-[3px] border-accent/50 hover:border-accent animate-pulse shadow-accent/20 group"
          >
            <Play className="w-5 h-5 text-accent group-hover:scale-110 transition-transform mb-0.5 ml-0.5" />
            <span className="text-[10px] font-bold font-mono tracking-tighter">
              {formatTime(sessionTime)}
            </span>
          </div>
        )}

      <AnimatePresence>
        {showCancelConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelConfirm(false)}
              className="absolute inset-0 bg-ink/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass-panel p-6 border-white/10"
            >
              <h3 className="font-bold text-lg mb-2">Hủy buổi tập?</h3>
              <p className="text-sm text-brand/60 mb-6">Bạn có chắc chắn muốn hủy bài tập này? Mọi dữ liệu tập luyện sẽ bị xóa và không thể khôi phục.</p>
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-sm uppercase tracking-widest transition-colors font-mono"
                >
                  Tiếp tục tập
                </button>
                <button 
                  onClick={() => {
                    setShowCancelConfirm(false);
                    removeWorkoutState();
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/30 font-bold text-sm uppercase tracking-widest transition-colors font-mono"
                >
                  Đồng ý hủy
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </>
  );
}
