/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, loginWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { 
  Dumbbell, 
  History as HistoryIcon, 
  LayoutDashboard, 
  Plus, 
  Settings,
  LogOut,
  User as UserIcon,
  Loader2,
  Heart,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import ExerciseLibrary from './components/ExerciseLibrary';
import WorkoutHistory from './components/WorkoutHistory';
import ActiveWorkout from './components/ActiveWorkout';
import WorkoutTemplates from './components/WorkoutTemplates';
import HealthProfile from './components/HealthProfile';
import { fetchExercises } from './services/exerciseService';
import { Exercise, WorkoutTemplate } from './types';

type Tab = 'dashboard' | 'exercises' | 'routines' | 'history' | 'health';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [fetchingExercises, setFetchingExercises] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isWorkoutActive, setIsWorkoutActive] = useState(() => {
    return localStorage.getItem('activeWorkoutState') !== null;
  });
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState(() => {
    return localStorage.getItem('activeWorkoutState') !== null;
  });
  const [workoutToSwitchTo, setWorkoutToSwitchTo] = useState<WorkoutTemplate | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<WorkoutTemplate | null>(() => {
    try {
      const saved = localStorage.getItem('activeWorkoutState');
      if (saved) {
        return JSON.parse(saved).initialTemplate || null;
      }
    } catch(e) {}
    return null;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadExercises() {
      try {
        const data = await fetchExercises();
        setExercises(data);
      } finally {
        setFetchingExercises(false);
      }
    }
    loadExercises();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading || (user && fetchingExercises)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Dumbbell className="w-12 h-12 text-accent" />
        </motion.div>
        {fetchingExercises && user && (
          <p className="mt-4 text-xs font-mono uppercase tracking-widest text-brand/40 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang tải dữ liệu bài tập...
          </p>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-accent/20">
            <Dumbbell className="w-12 h-12 text-ink" />
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">FlexPath</h1>
          <p className="text-brand/60 mb-8 font-mono text-sm uppercase tracking-widest">Master Your Performance</p>
          <button
            onClick={loginWithGoogle}
            className="w-full bg-brand text-ink font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-brand/90 transition-all active:scale-95"
          >
            <UserIcon className="w-5 h-5" />
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-center p-4 border-b border-white/5 sticky top-0 bg-ink/80 backdrop-blur-xl z-40 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-accent" />
          <span className="font-bold tracking-tight">FlexPath</span>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-ink/80 backdrop-blur-xl border-t border-white/5 py-4 px-4 flex justify-between items-center pb-safe">
        <div className="flex items-center gap-1">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} />
          <NavButton active={activeTab === 'routines'} onClick={() => setActiveTab('routines')} icon={Settings} />
          <NavButton active={activeTab === 'exercises'} onClick={() => setActiveTab('exercises')} icon={Dumbbell} />
        </div>
        
        <button 
          onClick={() => {
            if (isWorkoutActive) {
              setIsWorkoutMinimized(false);
            } else {
              setActiveTemplate(null);
              setIsWorkoutActive(true);
            }
          }}
          className={cn("w-14 h-14 shrink-0 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,107,0,0.4)] -translate-y-5 border-[4px] border-ink relative z-10", isWorkoutActive ? "bg-accent/50 text-white" : "bg-accent text-white")}
        >
          {isWorkoutActive ? <Play className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>

        <div className="flex items-center gap-1">
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={HistoryIcon} />
          <NavButton active={activeTab === 'health'} onClick={() => setActiveTab('health')} icon={Heart} />
          <button onClick={handleLogout} className="p-2 transition-all">
            <img src={user?.photoURL || ''} alt="User" className="w-6 h-6 rounded-full border border-white/10" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 p-6 h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="p-2 bg-accent rounded-lg">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">FlexPath</span>
        </div>

        <nav className="space-y-2 flex-grow">
          <SidebarLink active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Bàn làm việc" />
          <SidebarLink active={activeTab === 'health'} onClick={() => setActiveTab('health')} icon={Heart} label="Sức khỏe" />
          <SidebarLink active={activeTab === 'routines'} onClick={() => setActiveTab('routines')} icon={Settings} label="Giáo án của tôi" />
          <SidebarLink active={activeTab === 'exercises'} onClick={() => setActiveTab('exercises')} icon={Dumbbell} label="Thư viện bài tập" />
          <SidebarLink active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={HistoryIcon} label="Lịch sử tập" />
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2">
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-white/10" />
            <div className="truncate">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-[10px] uppercase opacity-50 font-mono">Elite Member</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 pb-32 md:pb-8 overflow-y-auto max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <Dashboard onStartWorkout={() => {
            if (isWorkoutActive) {
               setIsWorkoutMinimized(false);
            } else {
               setActiveTemplate(null);
               setIsWorkoutActive(true);
            }
          }} onViewAllHistory={() => setActiveTab('history')} />}
          {activeTab === 'routines' && (
            <WorkoutTemplates 
              exercises={exercises} 
              onStartFromTemplate={(template) => {
                if (isWorkoutActive) {
                   setWorkoutToSwitchTo(template);
                   return;
                }
                setIsWorkoutMinimized(false);
                setActiveTemplate(template);
                setIsWorkoutActive(true);
              }} 
            />
          )}
          {activeTab === 'exercises' && <ExerciseLibrary exercises={exercises} />}
          {activeTab === 'history' && <WorkoutHistory />}
          {activeTab === 'health' && <HealthProfile />}
        </AnimatePresence>
      </main>

      {/* Workout Modal */}
      <AnimatePresence>
        {isWorkoutActive && (
          <ActiveWorkout 
            exercises={exercises}
            initialTemplate={activeTemplate}
            minimized={isWorkoutMinimized}
            onMinimize={() => setIsWorkoutMinimized(true)}
            onRestore={() => setIsWorkoutMinimized(false)}
            onClose={() => {
              setIsWorkoutActive(false);
              setIsWorkoutMinimized(false);
              setActiveTemplate(null);
            }} 
            onComplete={() => {
              setIsWorkoutActive(false);
              setIsWorkoutMinimized(false);
              setActiveTemplate(null);
              setActiveTab('history');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {workoutToSwitchTo && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWorkoutToSwitchTo(null)}
              className="absolute inset-0 bg-ink/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass-panel p-6 border-white/10"
            >
              <h3 className="font-bold text-lg mb-2">Hủy buổi tập hiện tại?</h3>
              <p className="text-sm text-brand/60 mb-6">Bạn đang có một buổi tập diễn ra. Nếu bắt đầu giáo án mới, buổi tập hiện tại sẽ bị hủy và mất dữ liệu.</p>
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setWorkoutToSwitchTo(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-sm uppercase tracking-widest transition-colors font-mono"
                >
                  Giữ cũ
                </button>
                <button 
                  onClick={() => {
                    localStorage.removeItem('activeWorkoutState');
                    setIsWorkoutMinimized(false);
                    // To force remount, we should briefly toggle off
                    setIsWorkoutActive(false);
                    setTimeout(() => {
                      setActiveTemplate(workoutToSwitchTo);
                      setIsWorkoutActive(true);
                      setWorkoutToSwitchTo(null);
                    }, 0);
                  }}
                  className="flex-1 py-3 rounded-xl bg-accent text-white hover:bg-accent/90 font-bold text-sm uppercase tracking-widest transition-colors font-mono"
                >
                  Bắt đầu mới
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon }: { active: boolean, onClick: () => void, icon: any }) {
  return (
    <button onClick={onClick} className={cn("p-2 transition-all", active ? "text-accent scale-110" : "text-brand/40")}>
      <Icon className="w-8 h-8" />
    </button>
  );
}

function SidebarLink({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-sm",
        active ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-brand/60 hover:bg-white/5 hover:text-brand"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
