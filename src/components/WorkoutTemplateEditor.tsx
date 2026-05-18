import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Save, Trash2, Search, ChevronRight, GripVertical, Dumbbell, Filter, Info, Play, Lightbulb } from 'lucide-react';
import { Exercise, WorkoutTemplate, TemplateExercise } from '../types';
import { saveTemplate } from '../services/workoutTemplateService';
import { cn } from '../lib/utils';
import { ExerciseAnimation } from './ExerciseAnimation';
import { SAMPLE_TEMPLATES, buildTemplateFromSample } from '../lib/templates';

interface WorkoutTemplateEditorProps {
  exercises: Exercise[];
  initialTemplate?: WorkoutTemplate | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function WorkoutTemplateEditor({ 
  exercises, 
  initialTemplate, 
  onSave, 
  onCancel 
}: WorkoutTemplateEditorProps) {
  const [name, setName] = useState(initialTemplate?.name || '');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>(initialTemplate?.exercises || []);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [showPickerFilters, setShowPickerFilters] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(24);

  const filterOptions = useMemo(() => {
    if (!exercises) return { muscles: [], equipments: [], levels: [] };
    return {
      muscles: Array.from(new Set(exercises.flatMap(ex => ex.primaryMuscles || []))).filter(Boolean).sort(),
      equipments: Array.from(new Set(exercises.map(ex => ex.equipment).filter(Boolean))).sort(),
      levels: Array.from(new Set(exercises.map(ex => ex.level).filter(Boolean))).sort(),
    };
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const matchesSearch = (ex.name || '').toLowerCase().includes(exerciseSearch.toLowerCase());
      const matchesMuscle = selectedMuscle === 'All' || (ex.primaryMuscles && ex.primaryMuscles.includes(selectedMuscle));
      const matchesEquipment = selectedEquipment === 'All' || ex.equipment === selectedEquipment;
      const matchesLevel = selectedLevel === 'All' || ex.level === selectedLevel;
      
      return matchesSearch && matchesMuscle && matchesEquipment && matchesLevel;
    });
  }, [exerciseSearch, selectedMuscle, selectedEquipment, selectedLevel, exercises]);

  useEffect(() => {
    setDisplayLimit(24);
  }, [exerciseSearch, selectedMuscle, selectedEquipment, selectedLevel]);

  const visibleExercises = filteredExercises.slice(0, displayLimit);

  const resetPickerFilters = () => {
    setSelectedMuscle('All');
    setSelectedEquipment('All');
    setSelectedLevel('All');
    setExerciseSearch('');
  };

  const addExercise = (exercise: Exercise) => {
    const newEx: TemplateExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: 3,
      reps: 10,
      notes: ''
    };
    setTemplateExercises([...templateExercises, newEx]);
    setIsAddingExercise(false);
    setExerciseSearch('');
  };

  const removeExercise = (index: number) => {
    setTemplateExercises(templateExercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, updates: Partial<TemplateExercise>) => {
    const newExercises = [...templateExercises];
    newExercises[index] = { ...newExercises[index], ...updates };
    setTemplateExercises(newExercises);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('Vui lòng nhập tên buổi tập');
    if (templateExercises.length === 0) return alert('Vui lòng thêm ít nhất một bài tập');

    setSaving(true);
    try {
      await saveTemplate({
        name,
        description,
        exercises: templateExercises
      }, initialTemplate?.id);
      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Có lỗi xảy ra khi lưu giáo án');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-ink border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div>
            <h2 className="text-xl font-bold">{initialTemplate ? 'Chỉnh sửa Giáo án' : 'Tạo Giáo án mới'}</h2>
            <p className="text-xs text-brand/40 uppercase font-mono tracking-widest mt-1">Thiết kế lịch tập riêng của bạn</p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 opacity-50" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {/* Metadata */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono tracking-widest text-brand/40">Tên buổi tập</label>
              <input 
                type="text"
                placeholder="VD: Buổi Sáng - Ngực & Trẻ"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-accent"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono tracking-widest text-brand/40">Ghi chú / Mô tả</label>
              <textarea 
                placeholder="VD: Tập trung vào cảm nhận cơ..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-accent min-h-[80px]"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Exercises List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand/40">Danh sách bài tập ({templateExercises.length})</h3>
              <button 
                onClick={() => setIsAddingExercise(true)}
                className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest text-accent bg-accent/10 px-3 py-1.5 rounded-full hover:bg-accent/20 transition-all border border-accent/20"
              >
                <Plus className="w-3 h-3" />
                Thêm bài tập
              </button>
            </div>

            <div className="space-y-3">
              {templateExercises.length === 0 ? (
                <div className="space-y-6">
                  <div className="py-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-brand/20">
                    <Dumbbell className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">Chưa có bài tập nào được thêm</p>
                  </div>
                  
                  {!initialTemplate && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-accent pb-2">
                        <Lightbulb className="w-4 h-4" />
                        <h4 className="text-xs font-bold uppercase tracking-widest">Giáo án mẫu gợi ý</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SAMPLE_TEMPLATES.map((sample, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              const templateInfo = buildTemplateFromSample(sample, exercises);
                              setName(templateInfo.name);
                              setDescription(templateInfo.description);
                              setTemplateExercises(templateInfo.exercises);
                            }}
                            className="bg-white/5 border border-white/5 p-4 rounded-2xl hover:border-accent/40 hover:bg-white/10 transition-colors cursor-pointer group"
                          >
                            <h5 className="font-bold text-sm text-brand group-hover:text-amber-400 transition-colors line-clamp-1">{sample.name}</h5>
                            <p className="text-[10px] text-brand/60 mt-1 line-clamp-2 leading-relaxed">{sample.description}</p>
                            <div className="mt-2 text-[10px] font-mono tracking-widest text-accent uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                              Sử dụng mẫu này →
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                templateExercises.map((te, idx) => {
                  const exercise = exercises.find(e => e.id === te.exerciseId);
                  return (
                    <div key={idx} className="glass-panel p-4 group relative">
                      <div className="flex items-start gap-4">
                        <div 
                          className="bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => exercise && setPreviewExercise(exercise)}
                        >
                          <ExerciseAnimation 
                            exercise={exercise!} 
                            className="w-10 h-10 object-contain opacity-60"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 
                            className="font-bold text-sm truncate cursor-pointer hover:text-accent transition-colors flex items-center gap-2"
                            onClick={() => exercise && setPreviewExercise(exercise)}
                          >
                            {te.exerciseName}
                            <Info className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                          </h4>
                          <div className="flex items-center gap-6 mt-3">
                          <div className="space-y-1">
                            <span className="text-[10px] opacity-40 uppercase">Số hiệp</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateExercise(idx, { sets: Math.max(1, te.sets - 1) })} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-xs">-</button>
                              <span className="text-sm font-mono w-4 text-center">{te.sets}</span>
                              <button onClick={() => updateExercise(idx, { sets: te.sets + 1 })} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-xs">+</button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] opacity-40 uppercase">Số reps</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateExercise(idx, { reps: Math.max(1, te.reps - 1) })} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-xs">-</button>
                              <span className="text-sm font-mono w-4 text-center">{te.reps}</span>
                              <button onClick={() => updateExercise(idx, { reps: te.reps + 1 })} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-xs">+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeExercise(idx)}
                        className="p-2 text-brand/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-grow py-3 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] py-3 rounded-2xl bg-accent text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:bg-accent/80 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Đang lưu...' : 'Lưu Giáo án'}
          </button>
        </div>

        {/* Exercise Picker Overlay */}
        <AnimatePresence>
          {isAddingExercise && (
            <motion.div 
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              className="absolute inset-0 z-[60] bg-ink flex flex-col"
            >
              <div className="p-6 border-b border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Thêm Bài Tập</h3>
                  <button onClick={() => setIsAddingExercise(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5 opacity-50" /></button>
                </div>
                
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input 
                      autoFocus
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-accent/40"
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
                      <div className="space-y-4 pt-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Bộ lọc chi tiết</span>
                          <button onClick={resetPickerFilters} className="text-[10px] uppercase font-mono tracking-widest text-accent">Xoá lọc</button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] opacity-40 uppercase mb-1.5">Nhóm cơ</p>
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
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
                              <p className="text-[10px] opacity-40 uppercase mb-1.5">Dụng cụ</p>
                              <select 
                                value={selectedEquipment}
                                onChange={e => setSelectedEquipment(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[10px] focus:outline-none focus:border-accent/40"
                              >
                                <option value="All">Tất cả dụng cụ</option>
                                {filterOptions.equipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                              </select>
                            </div>
                            <div>
                              <p className="text-[10px] opacity-40 uppercase mb-1.5">Độ khó</p>
                              <select 
                                value={selectedLevel}
                                onChange={e => setSelectedLevel(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[10px] focus:outline-none focus:border-accent/40"
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

                <div className="flex items-center justify-between px-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-brand/30">
                    Kết quả: <span className="text-accent">{filteredExercises.length}</span> bài tập
                  </p>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-2">
                {visibleExercises.map(ex => (
                  <div 
                    key={ex.id}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left group cursor-pointer"
                    onClick={() => setPreviewExercise(ex)}
                  >
                    <div className="bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ExerciseAnimation exercise={ex} className="w-10 h-10 object-contain" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-bold text-sm truncate">{ex.name}</p>
                      <p className="text-[10px] opacity-40 uppercase tracking-widest">{ex.equipment} • {ex.level}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          addExercise(ex);
                        }}
                        className="p-2.5 bg-accent/10 rounded-xl hover:bg-accent hover:text-white transition-all"
                      >
                        <Plus className="w-4 h-4 text-accent group-hover:text-inherit" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {visibleExercises.length < filteredExercises.length && (
                  <button 
                    onClick={() => setDisplayLimit(prev => prev + 24)}
                    className="w-full py-4 text-[10px] font-mono uppercase tracking-[0.2em] text-accent hover:underline"
                  >
                    Xem thêm bài tập
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Modal */}
        <AnimatePresence>
          {previewExercise && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[70] bg-ink/95 backdrop-blur-md flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{previewExercise.name}</h3>
                  <p className="text-[10px] uppercase font-mono tracking-widest opacity-40">{previewExercise.category}</p>
                </div>
                <button 
                  onClick={() => setPreviewExercise(null)}
                  className="p-2 bg-white/5 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-panel p-4">
                    <p className="text-[10px] uppercase font-mono tracking-widest opacity-40 mb-1">Dụng cụ</p>
                    <p className="text-sm font-bold">{previewExercise.equipment}</p>
                  </div>
                  <div className="glass-panel p-4">
                    <p className="text-[10px] uppercase font-mono tracking-widest opacity-40 mb-1">Độ khó</p>
                    <p className="text-sm font-bold capitalize">{previewExercise.level}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest border-b border-white/5 pb-2">Hướng dẫn tập luyện</h4>
                  <div className="space-y-4">
                    {previewExercise.instructions?.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-mono flex items-center justify-center border border-accent/20">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-brand/70 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/10">
                <button 
                  onClick={() => {
                    addExercise(previewExercise);
                    setPreviewExercise(null);
                  }}
                  className="w-full py-4 bg-accent text-white font-bold rounded-2xl flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Thêm vào Giáo án
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
