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
  Info,
  GripVertical,
  Trophy,
  Sparkles,
  Share2,
  Award,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, getDoc, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { ExerciseLog, Exercise, WorkoutTemplate, Workout } from '../types';
import { ExerciseAnimation } from './ExerciseAnimation';
import { BADGES, Badge } from '../lib/achievements';

const getMETValue = (category?: string): number => {
  if (!category) return 4.5;
  const cat = category.toLowerCase();
  if (cat.includes('cardio')) return 8.0;
  if (cat.includes('plyometrics')) return 7.5;
  if (cat.includes('strength') || cat.includes('powerlifting')) return 5.0;
  if (cat.includes('olympic') || cat.includes('strongman')) return 6.0;
  if (cat.includes('stretching') || cat.includes('yoga')) return 2.3;
  return 4.5;
};


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
  const [unlockedBadgesToCelebrated, setUnlockedBadgesToCelebrated] = useState<any[]>([]);
  const [currentCelebrationIndex, setCurrentCelebrationIndex] = useState(0);

  // Voice Text-to-Speech Engine (Web Speech API)
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Autopilot Mode States
  const [isAutopilot, setIsAutopilot] = useState(false);
  const [autopilotStatus, setAutopilotStatus] = useState<'idle' | 'preparing' | 'counting' | 'resting'>('idle');
  const [activeLogIndex, setActiveLogIndex] = useState<number>(-1);
  const [activeSetIndex, setActiveSetIndex] = useState<number>(-1);
  const [currentRepCount, setCurrentRepCount] = useState<number>(0);
  const [prepCountdown, setPrepCountdown] = useState(5);
  const [autopilotPaused, setAutopilotPaused] = useState(false);
  const [autopilotSpeed, setAutopilotSpeed] = useState(2.5); // seconds per rep
  const [hasAnnouncedRestWarn, setHasAnnouncedRestWarn] = useState(false);

  // Drag and Drop States for logs reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    // Smart index tracking for active log during drag reordering
    const activeLogId = activeLogIndex !== -1 && logs[activeLogIndex] ? logs[activeLogIndex].id : null;

    const updatedLogs = [...logs];
    const [removed] = updatedLogs.splice(draggedIndex, 1);
    updatedLogs.splice(targetIndex, 0, removed);
    setLogs(updatedLogs);

    if (activeLogId) {
      const newActiveIdx = updatedLogs.findIndex(l => l.id === activeLogId);
      if (newActiveIdx !== -1) {
        setActiveLogIndex(newActiveIdx);
      }
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch drag states for mobile support
  const touchStartY = useRef<number | null>(null);
  const touchStartIndex = useRef<number | null>(null);
  const currentTouchIndex = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartIndex.current = index;
    touchStartY.current = e.touches[0].clientY;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartIndex.current === null) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const card = element.closest('[data-index]');
    if (card) {
      const targetIndex = parseInt(card.getAttribute('data-index') || '', 10);
      if (!isNaN(targetIndex) && targetIndex !== touchStartIndex.current) {
        setDragOverIndex(targetIndex);
        currentTouchIndex.current = targetIndex;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartIndex.current !== null && currentTouchIndex.current !== null) {
      const sourceIdx = touchStartIndex.current;
      const targetIdx = currentTouchIndex.current;
      
      if (sourceIdx !== targetIdx) {
        // Smart index tracking for active log during drag reordering
        const activeLogId = activeLogIndex !== -1 && logs[activeLogIndex] ? logs[activeLogIndex].id : null;

        const updatedLogs = [...logs];
        const [removed] = updatedLogs.splice(sourceIdx, 1);
        updatedLogs.splice(targetIdx, 0, removed);
        setLogs(updatedLogs);

        if (activeLogId) {
          const newActiveIdx = updatedLogs.findIndex(l => l.id === activeLogId);
          if (newActiveIdx !== -1) {
            setActiveLogIndex(newActiveIdx);
          }
        }
      }
    }
    
    touchStartIndex.current = null;
    currentTouchIndex.current = null;
    touchStartY.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Find detailed exercise object for animation illustration
  const activeExerciseObj = useMemo(() => {
    if (activeLogIndex === -1 || !logs[activeLogIndex]) return null;
    const currentLog = logs[activeLogIndex];
    return exercises.find(e => e.id === currentLog.exerciseId || e.name.toLowerCase() === currentLog.exerciseName.toLowerCase()) || null;
  }, [activeLogIndex, logs, exercises]);

  // Find next incomplete set
  const findNextIncompleteSet = (currentLogs = logs) => {
    for (let logIdx = 0; logIdx < currentLogs.length; logIdx++) {
      const log = currentLogs[logIdx];
      for (let setIdx = 0; setIdx < log.sets.length; setIdx++) {
        if (!log.sets[setIdx].completed) {
          return { logIdx, setIdx };
        }
      }
    }
    return null;
  };

  // Start Autopilot
  const startAutopilot = () => {
    if (logs.length === 0) {
      speak("Vui lòng thêm ít nhất một bài tập để bắt đầu chế độ tự động.");
      alert("Vui lòng thêm ít nhất một bài tập để bắt đầu chế độ tự động!");
      return;
    }
    
    const nextSet = findNextIncompleteSet();
    if (!nextSet) {
      speak("Tất cả các set tập đã được hoàn thành. Bạn có thể kết thúc buổi tập.");
      alert("Tất cả các set tập đã được hoàn thành!");
      return;
    }

    setIsAutopilot(true);
    setAutopilotPaused(false);
    setActiveLogIndex(nextSet.logIdx);
    setActiveSetIndex(nextSet.setIdx);
    setAutopilotStatus('preparing');
    
    const currentLog = logs[nextSet.logIdx];
    const targetReps = currentLog.sets[nextSet.setIdx].reps;
    speak(`Bắt đầu tập tự động bài ${currentLog.exerciseName}. Set thứ ${nextSet.setIdx + 1}. Mục tiêu ${targetReps} reps. Chuẩn bị tập trong 5 giây.`);
  };

  // Helper to advance Autopilot
  const goToNextAutopilotSet = (currentLogs = logs) => {
    const nextSet = findNextIncompleteSet(currentLogs);
    if (nextSet) {
      setActiveLogIndex(nextSet.logIdx);
      setActiveSetIndex(nextSet.setIdx);
      setAutopilotStatus('preparing');
      
      const currentLog = currentLogs[nextSet.logIdx];
      const targetReps = currentLog.sets[nextSet.setIdx].reps;
      speak(`Tiếp tục bài ${currentLog.exerciseName}. Set thứ ${nextSet.setIdx + 1}. Mục tiêu ${targetReps} reps. Chuẩn bị tập trong 5 giây.`);
    } else {
      setIsAutopilot(false);
      setAutopilotStatus('idle');
      speak("Chúc mừng bạn đã hoàn thành xuất sắc toàn bộ bài tập hôm nay! Bấm nút Xong ở góc trên để lưu kết quả tập luyện.");
    }
  };

  // Effect to handle preparation countdown
  useEffect(() => {
    if (!isAutopilot || autopilotPaused || autopilotStatus !== 'preparing') return;

    setPrepCountdown(5);
    const interval = setInterval(() => {
      setPrepCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          setAutopilotStatus('counting');
          setCurrentRepCount(0);
          speak("Bắt đầu tập!");
          return 0;
        }
        if (c - 1 <= 3) {
          speak((c - 1).toString());
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutopilot, autopilotPaused, autopilotStatus, activeLogIndex, activeSetIndex]);

  // Effect to handle rep counting
  useEffect(() => {
    if (!isAutopilot || autopilotPaused || autopilotStatus !== 'counting') return;
    if (activeLogIndex === -1 || activeSetIndex === -1) return;

    const currentLog = logs[activeLogIndex];
    const targetReps = currentLog.sets[activeSetIndex].reps;

    const interval = setInterval(() => {
      setCurrentRepCount(rc => {
        const nextRc = rc + 1;
        speak(nextRc.toString());
        
        if (nextRc >= targetReps) {
          clearInterval(interval);
          // Set set as completed!
          setTimeout(() => {
            const newLogs = [...logs];
            newLogs[activeLogIndex].sets[activeSetIndex].completed = true;
            newLogs[activeLogIndex].sets[activeSetIndex].timestamp = new Date().toISOString();
            setLogs(newLogs);
            
            speak(`Hoàn thành set! Tuyệt vời. Bắt đầu thời gian nghỉ.`);
            
            if (restDuration > 0) {
              setRestTimer(restDuration);
              setAutopilotStatus('resting');
            } else {
              goToNextAutopilotSet(newLogs);
            }
          }, 1000);
          return targetReps;
        }
        return nextRc;
      });
    }, autopilotSpeed * 1000);

    return () => clearInterval(interval);
  }, [isAutopilot, autopilotPaused, autopilotStatus, activeLogIndex, activeSetIndex, autopilotSpeed, restDuration, logs]);

  // Effect to handle rest countdown and next set transition
  useEffect(() => {
    if (!isAutopilot || autopilotStatus !== 'resting') {
      setHasAnnouncedRestWarn(false);
      return;
    }

    if (restTimer === 10 && !hasAnnouncedRestWarn) {
      speak("Còn mười giây nghỉ. Chuẩn bị tập set tiếp theo.");
      setHasAnnouncedRestWarn(true);
    }

    if (restTimer === 0) {
      // Small delay to let the timer settle
      goToNextAutopilotSet();
    }
  }, [restTimer, isAutopilot, autopilotStatus, hasAnnouncedRestWarn]);

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

  // Real-time synchronization when app resumes from background (mobile lock screen / tab suspension)
  useEffect(() => {
    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        try {
          const saved = localStorage.getItem('activeWorkoutState');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.timestamp && !parsed.paused) {
              const elapsedSinceLastTick = Math.floor((Date.now() - parsed.timestamp) / 1000);
              if (elapsedSinceLastTick > 0) {
                setSessionTime(parsed.sessionTime + elapsedSinceLastTick);
              }
            }
          }
        } catch (e) {
          console.error('Error syncing real-time timer:', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilitySync);
    window.addEventListener('focus', handleVisibilitySync);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilitySync);
      window.removeEventListener('focus', handleVisibilitySync);
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (restTimer !== null && restTimer > 0) {
      const shouldTick = !(isAutopilot && autopilotPaused);
      if (shouldTick) {
        interval = setInterval(() => setRestTimer(t => (t !== null ? t - 1 : null)), 1000);
      }
    } else if (restTimer === 0) {
      setRestTimer(null);
    }
    return () => clearInterval(interval);
  }, [restTimer, isAutopilot, autopilotPaused]);

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
      let userWeight = 70;
      try {
        const profileRef = doc(db, 'health_profiles', auth.currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          if (profileData.weight) {
            userWeight = profileData.weight;
          }
        }
      } catch (e) {
        console.error("Error fetching user weight for calorie calculation:", e);
      }

      const totalCompletedSets = logs.reduce((acc, log) => acc + log.sets.filter(s => s.completed).length, 0);
      
      let totalCalories = 0;
      const logsWithCalories = logs.map(log => {
        const completedSetsInLog = log.sets.filter(s => s.completed).length;
        if (completedSetsInLog === 0 || totalCompletedSets === 0) {
          return { ...log, calories: 0, sets: log.sets.filter(s => s.completed) };
        }
        
        const exerciseObj = exercises.find(e => e.id === log.exerciseId);
        const met = getMETValue(exerciseObj?.category);
        
        const exerciseDurationMinutes = (sessionTime / 60) * (completedSetsInLog / totalCompletedSets);
        const calories = Math.round((met * 3.5 * userWeight / 200) * exerciseDurationMinutes);
        totalCalories += calories;
        
        return {
          ...log,
          calories,
          sets: log.sets.filter(s => s.completed)
        };
      });

      const workoutRef = await addDoc(collection(db, 'workouts'), {
        userId: auth.currentUser.uid,
        name: `Buổi tập ${new Date().toLocaleDateString('vi-VN')}`,
        startTime,
        endTime: new Date().toISOString(),
        duration: sessionTime,
        status: 'completed',
        calories: totalCalories,
        totalVolume: logs.reduce((acc, log) => acc + log.sets.reduce((sAcc, s) => sAcc + (s.completed ? s.reps * s.weight : 0), 0), 0)
      });

      for (const logWithCal of logsWithCalories) {
        await addDoc(collection(db, `workouts/${workoutRef.id}/logs`), logWithCal);
      }
      removeWorkoutState();

      // --- ACHIEVEMENT CHECK ENGINE ---
      let newlyUnlocked: { badgeId: string, unlockedAt: string }[] = [];
      try {
        const healthProfileRef = doc(db, 'health_profiles', auth.currentUser.uid);
        const healthProfileSnap = await getDoc(healthProfileRef);
        let existingUnlocked: { badgeId: string, unlockedAt: string }[] = [];
        let profileData = {};
        
        if (healthProfileSnap.exists()) {
          profileData = healthProfileSnap.data();
          existingUnlocked = (profileData as any).unlockedAchievements || [];
        }
        
        const existingIds = new Set(existingUnlocked.map(b => b.badgeId));
        
        // Fetch all historical workouts (including the one just completed)
        const qWorkouts = query(
          collection(db, 'workouts'),
          where('userId', '==', auth.currentUser.uid)
        );
        const workoutsSnap = await getDocs(qWorkouts);
        const pastWorkouts = workoutsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Workout[];
        
        // Add the current workout because it might not be indexed in the query yet
        let allCompleted = pastWorkouts.filter(w => w.status === 'completed' && w.id !== workoutRef.id);
        
        const currentWorkoutData: Workout = {
          id: workoutRef.id,
          userId: auth.currentUser.uid,
          name: `Buổi tập ${new Date().toLocaleDateString('vi-VN')}`,
          startTime,
          endTime: new Date().toISOString(),
          duration: sessionTime,
          status: 'completed',
          calories: totalCalories,
          totalVolume: logs.reduce((acc, log) => acc + log.sets.reduce((sAcc, s) => sAcc + (s.completed ? s.reps * s.weight : 0), 0), 0)
        };
        allCompleted.push(currentWorkoutData);

        // 1. Total workouts completed
        const workoutsCount = allCompleted.length;

        // 2. Cumulative volume
        const totalVolume = allCompleted.reduce((acc, w) => acc + (w.totalVolume || 0), 0);

        // 3. Max single calories and cumulative calories
        const maxSingleCalorie = allCompleted.reduce((acc, w) => {
          const cal = w.calories !== undefined && w.calories !== null ? w.calories : Math.round((5.0 * 3.5 * 70 / 200) * ((w.duration || 0) / 60));
          return Math.max(acc, cal);
        }, 0);
        const totalCaloriesAccumulated = allCompleted.reduce((acc, w) => {
          const cal = w.calories !== undefined && w.calories !== null ? w.calories : Math.round((5.0 * 3.5 * 70 / 200) * ((w.duration || 0) / 60));
          return acc + cal;
        }, 0);

        // 4. Max single duration and cumulative duration
        const parseDuration = (w: Workout) => {
          if (w.duration) return Math.floor(w.duration / 60);
          if (w.endTime) {
            return Math.floor((new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 60000);
          }
          return 0;
        };
        const maxSingleDuration = allCompleted.reduce((acc, w) => Math.max(acc, parseDuration(w)), 0);
        const totalDurationMinutes = allCompleted.reduce((acc, w) => acc + parseDuration(w), 0);

        // 5. Streak calculation
        const workoutDates = allCompleted.map(w => {
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

        // 6. Weekly consecutive workouts (>= 3/week for N weeks)
        const getISOWeek = (dateStr: string) => {
          const d = new Date(dateStr);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 4 - (d.getDay() || 7));
          const yearStart = new Date(d.getFullYear(), 0, 1);
          const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
          return `${d.getFullYear()}-W${weekNo}`;
        };
        const weekCounts: { [key: string]: number } = {};
        allCompleted.forEach(w => {
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
          if (p1.yr === p2.yr) return p2.wk === p1.wk + 1;
          if (p2.yr === p1.yr + 1) return p1.wk >= 52 && p2.wk === 1;
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

        // Check each badge criteria
        BADGES.forEach(badge => {
          if (existingIds.has(badge.id)) return; // already unlocked
          
          let currentVal = 0;
          switch (badge.targetField) {
            case 'workouts':
              currentVal = workoutsCount;
              break;
            case 'volume':
              currentVal = totalVolume;
              break;
            case 'calories':
              currentVal = badge.id === 'nuclear_reactor' ? totalCaloriesAccumulated : maxSingleCalorie;
              break;
            case 'streak':
              currentVal = currentStreak;
              break;
            case 'duration':
              currentVal = badge.id === 'titanium_will' ? totalDurationMinutes : maxSingleDuration;
              break;
            case 'weekly':
              currentVal = maxConsecutiveWeeks;
              break;
          }

          if (currentVal >= badge.targetValue) {
            newlyUnlocked.push({
              badgeId: badge.id,
              unlockedAt: new Date().toISOString()
            });
          }
        });

        if (newlyUnlocked.length > 0) {
          const updatedAchievements = [...existingUnlocked, ...newlyUnlocked];
          await setDoc(healthProfileRef, {
            ...profileData,
            unlockedAchievements: updatedAchievements,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          const fullBadgeObjects = newlyUnlocked.map(item => {
            const staticBadge = BADGES.find(b => b.id === item.badgeId);
            return staticBadge ? { ...staticBadge, unlockedAt: item.unlockedAt } : null;
          }).filter(Boolean);

          setUnlockedBadgesToCelebrated(fullBadgeObjects);
          setCurrentCelebrationIndex(0);
          speak(`Chúc mừng bạn đã mở khóa thành tích mới!`);
          return; // Wait for user to close celebration screen
        }
      } catch (err) {
        console.error("Error checking achievements:", err);
      }

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

        {/* Autopilot Control Panel */}
        <div className={cn(
          "glass-panel p-5 border relative overflow-hidden transition-all duration-300",
          isAutopilot 
            ? "border-amber-500/30 bg-amber-500/5 shadow-lg shadow-amber-500/5" 
            : "border-accent/10 hover:border-accent/20"
        )}>
          {/* Neon accent glow behind card if autopilot is active */}
          {isAutopilot && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full filter blur-2xl pointer-events-none -mr-10 -mt-10" />
          )}

          {!isAutopilot ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                  <TimerIcon className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white flex items-center gap-2">
                    FlexPath Autopilot
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Premium</span>
                  </h4>
                  <p className="text-xs text-brand/60 mt-1 leading-relaxed">
                    Chế độ tập Rảnh tay: Voice AI tự động nhắc chuẩn bị, đếm rep nhịp nhàng và kích hoạt thời gian nghỉ mà không cần chạm tay vào màn hình.
                  </p>
                </div>
              </div>
              <button
                onClick={startAutopilot}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-ink font-bold text-sm tracking-wide shadow-lg shadow-orange-500/15 hover:scale-[1.03] active:scale-[0.97] transition-all whitespace-nowrap"
              >
                Bật Chế Độ Tự Động
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      autopilotPaused ? "bg-amber-500" : "bg-green-500"
                    )}></span>
                    <span className={cn(
                      "relative inline-flex rounded-full h-2.5 w-2.5",
                      autopilotPaused ? "bg-amber-500" : "bg-green-500"
                    )}></span>
                  </span>
                  <span className="text-xs font-mono uppercase tracking-widest text-brand/80">
                    {autopilotPaused ? 'Tạm Dừng Autopilot' : 'Autopilot Đang Chạy'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAutopilotPaused(!autopilotPaused)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-all text-white border border-white/10"
                  >
                    {autopilotPaused ? 'Tiếp Tục' : 'Tạm Dừng'}
                  </button>
                  <button
                    onClick={() => {
                      setIsAutopilot(false);
                      setAutopilotStatus('idle');
                      speak("Đã tắt chế độ tự động.");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all"
                  >
                    Tắt
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Active Exercise info details */}
                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase text-brand/40 tracking-wider">Bài tập hiện tại</p>
                  <h5 className="font-bold text-lg text-white tracking-tight leading-snug">
                    {logs[activeLogIndex]?.exerciseName || '---'}
                  </h5>
                  <p className="text-xs text-brand/60 font-mono">
                    Set {activeSetIndex + 1} của {logs[activeLogIndex]?.sets.length} • Mục tiêu {logs[activeLogIndex]?.sets[activeSetIndex]?.reps} Reps
                  </p>
                </div>

                {/* Animated Exercise illustration */}
                <div className="relative aspect-video md:aspect-[4/3] w-full rounded-2xl overflow-hidden border border-amber-500/20 bg-black/40 flex items-center justify-center shadow-lg shadow-amber-500/5 group isolate min-h-[110px]">
                  {activeExerciseObj ? (
                    <ExerciseAnimation 
                      exercise={activeExerciseObj}
                      className="w-full h-full object-contain relative z-10 p-2"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-brand/20">
                      <Dumbbell className="w-8 h-8 mb-1 opacity-20" />
                      <span className="text-[9px] uppercase font-mono tracking-widest text-brand/40">Không có ảnh</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-20" />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full z-30 border border-white/5">
                    <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[8px] font-bold uppercase font-mono tracking-widest text-white/70">MINH HỌA</span>
                  </div>
                </div>

                {/* Counting state / timer / preparing */}
                <div className="bg-white/5 rounded-xl p-3.5 flex flex-col justify-center items-center text-center relative border border-white/5 min-h-[110px]">
                  {autopilotStatus === 'preparing' && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono uppercase text-amber-400 tracking-wider animate-pulse">Đang chuẩn bị</p>
                      <h4 className="text-3xl font-extrabold text-white font-mono animate-bounce">{prepCountdown}s</h4>
                      <p className="text-[10px] text-brand/40">Vào tư thế sẵn sàng!</p>
                    </div>
                  )}

                  {autopilotStatus === 'counting' && (
                    <div className="w-full space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-brand/50 uppercase tracking-widest">Đang đếm reps</span>
                        <span className="font-bold text-amber-400 font-mono">{currentRepCount} / {logs[activeLogIndex]?.sets[activeSetIndex]?.reps}</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${(currentRepCount / (logs[activeLogIndex]?.sets[activeSetIndex]?.reps || 1)) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-brand/40 font-mono tracking-wide">Nhịp đếm: {autopilotSpeed}s/rep</p>
                    </div>
                  )}

                  {autopilotStatus === 'resting' && (
                    <div className="space-y-1 animate-pulse">
                      <p className="text-[10px] font-mono uppercase text-green-400 tracking-wider">Đang nghỉ ngơi</p>
                      <h4 className="text-3xl font-extrabold text-white font-mono">{restTimer || 0}s</h4>
                      <button
                        onClick={() => {
                          setRestTimer(null);
                          goToNextAutopilotSet();
                        }}
                        className="text-[9px] font-bold uppercase tracking-wider text-amber-500/70 hover:text-amber-400 underline underline-offset-2 mt-1"
                      >
                        Bỏ qua nghỉ để tập tiếp
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Adjust counter speed */}
              <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand/50">Tốc độ đếm Rep (Nhịp tập):</span>
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => setAutopilotSpeed(s => Math.max(1.5, Number((s - 0.5).toFixed(1))))}
                    disabled={autopilotSpeed <= 1.5}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    -0.5s
                  </button>
                  <span className="text-xs font-mono font-bold text-amber-400">{autopilotSpeed} giây / rep</span>
                  <button 
                    onClick={() => setAutopilotSpeed(s => Math.min(5.0, Number((s + 0.5).toFixed(1))))}
                    disabled={autopilotSpeed >= 5.0}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    +0.5s
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {logs.map((log, idx) => (
          <div 
            key={log.id} 
            data-index={idx}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={cn(
              "glass-panel overflow-hidden transition-all duration-200 border border-transparent",
              draggedIndex === idx && "opacity-30 border-dashed border-white/20 scale-[0.98]",
              dragOverIndex === idx && "border-accent/40 bg-accent/5 -translate-y-1 shadow-lg shadow-accent/10"
            )}
          >
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div 
                onTouchStart={(e) => handleTouchStart(e, idx)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="flex items-center gap-3 cursor-grab active:cursor-grabbing group touch-none"
              >
                <GripVertical className="w-5 h-5 text-brand/20 group-hover:text-brand/50 transition-colors shrink-0" />
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

      <AnimatePresence>
        {unlockedBadgesToCelebrated.length > 0 && (() => {
          const currentBadge = unlockedBadgesToCelebrated[currentCelebrationIndex];
          if (!currentBadge) return null;
          const Icon = currentBadge.icon;
          const handleNext = () => {
            if (currentCelebrationIndex < unlockedBadgesToCelebrated.length - 1) {
              setCurrentCelebrationIndex(prev => prev + 1);
              speak(`Chúc mừng bạn đã đạt huy hiệu tiếp theo: ${unlockedBadgesToCelebrated[currentCelebrationIndex + 1].title}`);
            } else {
              setUnlockedBadgesToCelebrated([]);
              onComplete();
            }
          };

          return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              {/* Dark Glass Backdrop with heavy blur */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-ink/95 backdrop-blur-2xl"
              />

              {/* Glowing decorative background elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px] animate-pulse" />
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[80px]"
                  style={{ backgroundColor: currentBadge.glowColor }}
                />
              </div>

              {/* Cyberpunk Holographic Badge Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: 'spring', damping: 15 }}
                className="relative w-full max-w-md glass-panel p-8 text-center border border-white/10 bg-gradient-to-b from-white/5 to-black/90 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
              >
                {/* Neon Top Border Accent */}
                <div className={cn("absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r", currentBadge.gradientClass)} />

                <div className="space-y-6">
                  {/* Holographic Header */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 text-accent">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      <span className="text-xs font-mono uppercase tracking-[0.3em] font-bold">MỞ KHÓA THÀNH TÍCH</span>
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    {unlockedBadgesToCelebrated.length > 1 && (
                      <p className="text-[10px] font-mono uppercase text-white/40 tracking-wider">
                        Huy hiệu {currentCelebrationIndex + 1} / {unlockedBadgesToCelebrated.length}
                      </p>
                    )}
                  </div>

                  {/* Gigantic Glowing Icon Circle */}
                  <div className="relative flex items-center justify-center py-6">
                    {/* Rotating outer frame */}
                    <div className="absolute w-36 h-36 rounded-full border border-dashed border-white/20 animate-[spin_40s_linear_infinite]" />
                    <div className="absolute w-32 h-32 rounded-full border border-white/5 animate-[spin_20s_linear_infinite_reverse]" />
                    
                    <div 
                      className={cn(
                        "w-28 h-28 rounded-3xl flex items-center justify-center relative shrink-0 z-10 transition-all bg-gradient-to-br text-white shadow-2xl"
                        , currentBadge.gradientClass
                      )}
                      style={{
                        boxShadow: `0 0 40px ${currentBadge.glowColor}`
                      }}
                    >
                      <Icon className="w-14 h-14" />
                    </div>
                  </div>

                  {/* Badge Description */}
                  <div className="space-y-2">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight capitalize bg-gradient-to-r from-white via-white/90 to-brand/60 bg-clip-text text-transparent">
                      {currentBadge.title}
                    </h2>
                    <p className="text-sm text-accent/90 font-mono tracking-wider font-bold">
                      {currentBadge.description}
                    </p>
                  </div>

                  {/* Lore Text Container */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden">
                    <div className="absolute -top-10 -left-10 w-20 h-20 bg-accent/5 rounded-full blur-xl" />
                    <p className="italic text-xs text-brand/60 leading-relaxed font-mono">
                      "{currentBadge.longDescription}"
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleNext}
                      className={cn(
                        "w-full py-4 rounded-xl font-bold uppercase tracking-widest font-mono text-sm shadow-xl transition-all active:scale-[0.98] text-white flex items-center justify-center gap-2"
                        , currentBadge.gradientClass
                      )}
                      style={{
                        boxShadow: `0 4px 20px -2px ${currentBadge.glowColor}`
                      }}
                    >
                      {currentCelebrationIndex < unlockedBadgesToCelebrated.length - 1 ? (
                        <>
                          <span>Huy hiệu tiếp theo</span>
                          <Trophy className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span>Hoàn thành</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
      </>
  );
}
