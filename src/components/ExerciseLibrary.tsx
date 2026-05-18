import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Dumbbell, ChevronRight, Info, X } from 'lucide-react';
import { Exercise } from '../types';
import { cn } from '../lib/utils';

import { ExerciseAnimation } from './ExerciseAnimation';

interface ExerciseLibraryProps {
  exercises: Exercise[];
}

export default function ExerciseLibrary({ exercises }: ExerciseLibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | 'All'>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string | 'All'>('All');
  const [selectedLevel, setSelectedLevel] = useState<string | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [displayLimit, setDisplayLimit] = useState(24);
  const [showFilters, setShowFilters] = useState(false);

  const filterOptions = useMemo(() => {
    if (!exercises) return { muscles: [], equipments: [], levels: [], categories: [] };
    
    return {
      muscles: Array.from(new Set(exercises.flatMap(ex => ex.primaryMuscles || []))).filter(Boolean).sort(),
      equipments: Array.from(new Set(exercises.map(ex => ex.equipment).filter(Boolean))).sort(),
      levels: Array.from(new Set(exercises.map(ex => ex.level).filter(Boolean))).sort(),
      categories: Array.from(new Set(exercises.map(ex => ex.category).filter(Boolean))).sort(),
    };
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter(ex => {
      const matchesSearch = (ex.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesMuscle = selectedMuscle === 'All' || (ex.primaryMuscles && ex.primaryMuscles.includes(selectedMuscle));
      const matchesEquipment = selectedEquipment === 'All' || ex.equipment === selectedEquipment;
      const matchesLevel = selectedLevel === 'All' || ex.level === selectedLevel;
      const matchesCategory = selectedCategory === 'All' || ex.category === selectedCategory;
      
      return matchesSearch && matchesMuscle && matchesEquipment && matchesLevel && matchesCategory;
    });
  }, [search, selectedMuscle, selectedEquipment, selectedLevel, selectedCategory, exercises]);

  // Reset limit when searching or filtering
  useMemo(() => {
    setDisplayLimit(24);
  }, [search, selectedMuscle, selectedEquipment, selectedLevel, selectedCategory]);

  const visibleExercises = filteredExercises.slice(0, displayLimit);

  const clearFilters = () => {
    setSelectedMuscle('All');
    setSelectedEquipment('All');
    setSelectedLevel('All');
    setSelectedCategory('All');
    setSearch('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Thư Viện Bài Tập</h2>
        <p className="text-brand/60 font-mono text-xs uppercase tracking-widest mt-1">Tìm kiếm và khám phá {exercises.length} bài tập</p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
            <input 
              type="text"
              placeholder="Tìm theo tên bài tập..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-accent/50 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-4 rounded-xl border transition-all flex items-center gap-2",
              showFilters ? "bg-accent border-accent text-white" : "bg-white/5 border-white/10 text-brand/60"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-medium">Lọc</span>
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-panel p-6 mb-4 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-brand/40">Bộ lọc chi tiết</h3>
                  <button 
                    onClick={clearFilters}
                    className="text-[10px] uppercase font-mono tracking-widest text-accent hover:underline"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Muscles */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40">Nhóm cơ</p>
                    <div className="flex flex-wrap gap-1.5">
                      <FilterButton 
                        active={selectedMuscle === 'All'} 
                        onClick={() => setSelectedMuscle('All')} 
                        label="Tất cả" 
                        size="sm"
                      />
                      {filterOptions.muscles.map(muscle => (
                        <FilterButton 
                          key={muscle}
                          active={selectedMuscle === muscle} 
                          onClick={() => setSelectedMuscle(muscle)} 
                          label={muscle} 
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Equipment */}
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40">Dụng cụ</p>
                      <select 
                        value={selectedEquipment}
                        onChange={(e) => setSelectedEquipment(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-accent"
                      >
                        <option value="All">Tất cả dụng cụ</option>
                        {filterOptions.equipments.map(eq => (
                          <option key={eq} value={eq}>{eq}</option>
                        ))}
                      </select>
                    </div>

                    {/* Level */}
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40">Độ khó</p>
                      <div className="flex flex-wrap gap-1.5">
                        <FilterButton 
                          active={selectedLevel === 'All'} 
                          onClick={() => setSelectedLevel('All')} 
                          label="Tất cả" 
                          size="sm"
                        />
                        {filterOptions.levels.map(lv => (
                          <FilterButton 
                            key={lv}
                            active={selectedLevel === lv} 
                            onClick={() => setSelectedLevel(lv)} 
                            label={lv} 
                            size="sm"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40">Phân loại</p>
                      <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-accent"
                      >
                        <option value="All">Tất cả bài tập</option>
                        {filterOptions.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand/40">
          Kết quả: <span className="text-accent">{filteredExercises.length}</span> bài tập
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {visibleExercises.map((exercise) => (
            <motion.div
              layout
              key={exercise.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setSelectedExercise(exercise)}
              className="data-row glass-panel p-4 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  {exercise.images && exercise.images[0] ? (
                    <img 
                      src={exercise.images[0]} 
                      alt={exercise.name}
                      className="w-full h-full object-cover opacity-80"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/100x100/18181b/6366f1?text=${encodeURIComponent(exercise.name)}`;
                      }}
                    />
                  ) : (
                    <Dumbbell className="w-5 h-5 opacity-40" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold flex items-center gap-2 capitalize text-sm">
                    {exercise.name}
                  </h4>
                  <p className="text-[10px] text-brand/40 uppercase font-mono tracking-wider">
                    {(exercise.primaryMuscles || []).join(', ')} • {exercise.equipment || 'No equipment'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-20 group-hover:opacity-50 transition-opacity" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {displayLimit < filteredExercises.length && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => setDisplayLimit(prev => prev + 24)}
            className="group flex flex-col items-center gap-2"
          >
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-brand/40 group-hover:text-accent transition-colors">
              Xem thêm ({filteredExercises.length - displayLimit} bài tập)
            </span>
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-accent group-hover:bg-accent/10 transition-all">
              <ChevronRight className="w-5 h-5 rotate-90" />
            </div>
          </button>
        </div>
      )}

      <AnimatePresence>
        {selectedExercise && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExercise(null)}
              className="absolute inset-0 bg-ink/95 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative z-70"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-[10px] font-bold uppercase tracking-wider">
                      {selectedExercise.level}
                    </span>
                    <span className="px-2 py-0.5 bg-white/10 text-brand/60 rounded text-[10px] font-bold uppercase tracking-wider">
                      {selectedExercise.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold capitalize">{selectedExercise.name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedExercise(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-6 space-y-8">
                <div className="space-y-4">
                  <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative group isolate">
                    <ExerciseAnimation 
                      exercise={selectedExercise}
                      className="w-full h-full object-contain relative z-10"
                    />
                    <div className="absolute inset-0 bg-accent/5 mix-blend-overlay" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-ink/80 backdrop-blur px-3 py-1 rounded-full z-20 border border-white/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      <span className="text-[10px] font-bold uppercase font-mono tracking-widest text-white/80">
                        {selectedExercise.gifUrl ? 'Video Minh Họa' : (selectedExercise.images && selectedExercise.images.length > 1 ? 'Chuyển Động' : 'Ảnh Minh Họa')}
                      </span>
                    </div>
                  </div>

                  {selectedExercise.images && selectedExercise.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {selectedExercise.images.map((img, i) => (
                        <button 
                          key={i}
                          className="w-20 aspect-square flex-shrink-0 bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:border-accent transition-colors"
                          onClick={() => {
                            // Update main view if we had a state for current main image, 
                            // but for now just showing them as reference
                          }}
                        >
                          <img src={img} alt={`Step ${i}`} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-panel p-4 border-white/5">
                    <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-1">Cơ mục tiêu</p>
                    <p className="font-bold capitalize">{(selectedExercise.primaryMuscles || []).join(', ')}</p>
                  </div>
                  <div className="glass-panel p-4 border-white/5">
                    <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-1">Dụng cụ</p>
                    <p className="font-bold capitalize">{selectedExercise.equipment || 'No equipment'}</p>
                  </div>
                  {selectedExercise.force && (
                    <div className="glass-panel p-4 border-white/5">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-1">Lực</p>
                      <p className="font-bold capitalize">{selectedExercise.force}</p>
                    </div>
                  )}
                  {selectedExercise.mechanic && (
                    <div className="glass-panel p-4 border-white/5">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-1">Cơ chế</p>
                      <p className="font-bold capitalize">{selectedExercise.mechanic}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <Info className="w-5 h-5 text-accent" />
                    Hướng dẫn thực hiện
                  </h4>
                  <div className="space-y-3">
                    {(selectedExercise.instructions || []).map((step, idx) => (
                      <div key={idx} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                        <span className="flex-shrink-0 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold font-mono">
                          {idx + 1}
                        </span>
                        <p className="text-brand/80 text-sm leading-relaxed">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedExercise.secondaryMuscles.length > 0 && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-4">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-bold text-blue-400 mb-1">Cơ tham gia phụ</h5>
                      <p className="text-xs text-brand/60 capitalize">
                        {(selectedExercise.secondaryMuscles || []).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  size?: 'sm' | 'md';
  key?: any;
}

function FilterButton({ active, onClick, label, size = 'md' }: FilterButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full text-xs font-mono uppercase tracking-wider transition-all border",
        size === 'sm' ? "px-3 py-1 text-[10px]" : "px-4 py-2",
        active ? "bg-accent border-accent text-white shadow-lg shadow-accent/20" : "bg-white/5 border-white/10 text-brand/60 hover:border-white/20"
      )}
    >
      {label}
    </button>
  );
}
