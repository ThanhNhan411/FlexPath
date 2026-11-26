import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Play, Trash2, Dumbbell, History, ChevronRight } from 'lucide-react';
import { WorkoutTemplate, Exercise } from '../types';
import { fetchUserTemplates, deleteTemplate } from '../services/workoutTemplateService';
import WorkoutTemplateEditor from './WorkoutTemplateEditor';
import PresetRoutines from './PresetRoutines';
import { cn } from '../lib/utils';

interface WorkoutTemplatesProps {
  exercises: Exercise[];
  onStartFromTemplate: (template: WorkoutTemplate) => void;
}

export default function WorkoutTemplates({ exercises, onStartFromTemplate }: WorkoutTemplatesProps) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [tab, setTab] = useState<'mine' | 'presets'>('mine');

  const loadTemplates = async () => {
    setLoading(true);
    const data = await fetchUserTemplates();
    setTemplates(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa giáo án này?')) return;
    try {
      await deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleEdit = (template: WorkoutTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTemplate(template);
    setIsEditorOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black italic tracking-tight uppercase">Giáo án của bạn</h2>
          <p className="text-brand/40 font-mono text-xs uppercase tracking-widest mt-1">Lưu trữ các lộ trình luyện tập yêu thích</p>
        </div>
        <button 
          onClick={() => {
            setSelectedTemplate(null);
            setIsEditorOpen(true);
          }}
          className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-accent/20 hover:bg-accent/80 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Tạo mới
        </button>
      </header>

      <div className="flex gap-2 border-b border-white/5">
        {([['mine', 'Của tôi'], ['presets', 'Giáo án có sẵn']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 text-xs font-mono uppercase tracking-widest border-b-2 -mb-px transition-colors',
              tab === key ? 'border-accent text-accent' : 'border-transparent text-brand/40 hover:text-brand/70'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'presets' && (
        <PresetRoutines
          exercises={exercises}
          onStartFromTemplate={onStartFromTemplate}
          onSaved={loadTemplates}
        />
      )}

      {tab === 'mine' && (loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-20 animate-pulse">
          <Dumbbell className="w-12 h-12 mb-4" />
          <p className="text-sm font-mono uppercase tracking-[0.3em]">Đang tải giáo án...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="glass-panel p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 bg-white/5 rounded-full">
            <History className="w-8 h-8 opacity-20" />
          </div>
          <div>
            <h3 className="font-bold">Chưa có giáo án nào</h3>
            <p className="text-sm text-brand/40 max-w-xs mx-auto mt-2">Hãy tạo giáo án đầu tiên để bắt đầu luyện tập nhanh chóng và có hệ thống hơn.</p>
          </div>
          <button 
            onClick={() => setIsEditorOpen(true)}
            className="text-xs uppercase font-mono tracking-widest text-accent hover:underline"
          >
            Bắt đầu tạo ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <motion.div 
              layout
              key={template.id}
              className="glass-panel p-6 group hover:border-accent/40 active:scale-[0.98] transition-all cursor-pointer"
              onClick={() => onStartFromTemplate(template)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold group-hover:text-accent transition-colors">{template.name}</h3>
                  <p className="text-xs text-brand/40 line-clamp-1 mt-1">{template.description || 'Không có mô tả'}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => handleEdit(template, e)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                  >
                    <Edit2 className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(template.id, e)}
                    className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors border border-white/5"
                  >
                    <Trash2 className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {template.exercises.slice(0, 3).map((ex, i) => (
                  <span key={i} className="px-2 py-1 bg-white/5 rounded-md text-[10px] font-mono uppercase text-brand/60">
                    {ex.exerciseName}
                  </span>
                ))}
                {template.exercises.length > 3 && (
                  <span className="px-2 py-1 bg-white/5 rounded-md text-[10px] font-mono uppercase text-brand/40">
                    +{template.exercises.length - 3} khác
                  </span>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand/30">
                  {template.exercises.length} bài tập • {template.exercises.reduce((acc, curr) => acc + curr.sets, 0)} hiệp
                </span>
                <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
                  Tập ngay
                  <Play className="w-3 h-3 fill-accent" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ))}

      {/* Editor Modal */}
      {isEditorOpen && (
        <WorkoutTemplateEditor 
          exercises={exercises}
          initialTemplate={selectedTemplate}
          onSave={() => {
            setIsEditorOpen(false);
            loadTemplates();
          }}
          onCancel={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
}
