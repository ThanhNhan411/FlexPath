import { useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Play, BookmarkPlus, Check, Calendar, Lightbulb, Loader2 } from 'lucide-react';
import { Exercise, WorkoutTemplate } from '../types';
import { saveTemplate } from '../services/workoutTemplateService';
import {
  PRESET_PROGRAMS,
  PresetProgram,
  PresetSession,
  PresetLevel,
  LEVEL_LABEL,
  GOAL_LABEL,
  EQUIPMENT_LABEL,
  resolveSession,
} from '../lib/presetRoutines';
import { cn } from '../lib/utils';

interface PresetRoutinesProps {
  exercises: Exercise[];
  onStartFromTemplate: (template: WorkoutTemplate) => void;
  onSaved: () => void;
}

const LEVEL_FILTERS: (PresetLevel | 'all')[] = ['all', 'beginner', 'intermediate', 'expert'];

export default function PresetRoutines({ exercises, onStartFromTemplate, onSaved }: PresetRoutinesProps) {
  const [level, setLevel] = useState<PresetLevel | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const programs = useMemo(
    () => PRESET_PROGRAMS.filter(p => level === 'all' || p.level === level),
    [level]
  );

  const buildTemplate = (program: PresetProgram, session: PresetSession) => {
    const resolved = resolveSession(session, exercises);
    const name = program.sessions.length > 1 ? `${program.name} – ${session.name}` : program.name;
    return { name: name.slice(0, 100), description: `${program.tagline}. ${session.focus}.`.slice(0, 1000), exercises: resolved };
  };

  const handleStart = (program: PresetProgram, session: PresetSession, index: number) => {
    const t = buildTemplate(program, session);
    if (t.exercises.length === 0) {
      setError('Không tải được bài tập cho giáo án này. Vui lòng thử lại sau.');
      return;
    }
    setError(null);
    const now = new Date().toISOString();
    onStartFromTemplate({
      id: `preset-${program.id}-${index}`,
      userId: '',
      name: t.name,
      description: t.description,
      exercises: t.exercises,
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleSave = async (program: PresetProgram, session: PresetSession, index: number) => {
    const key = `${program.id}-${index}`;
    const t = buildTemplate(program, session);
    if (t.exercises.length === 0) {
      setError('Không tải được bài tập cho giáo án này. Vui lòng thử lại sau.');
      return;
    }
    setError(null);
    setSavingKey(key);
    try {
      await saveTemplate(t);
      setSavedKeys(prev => new Set(prev).add(key));
      onSaved();
    } catch (e) {
      console.error('Error saving preset template:', e);
      setError('Lưu giáo án thất bại. Vui lòng thử lại.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {LEVEL_FILTERS.map(l => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider border transition-all',
              level === l
                ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20'
                : 'bg-white/5 border-white/10 text-brand/60 hover:border-white/20'
            )}
          >
            {l === 'all' ? 'Tất cả' : LEVEL_LABEL[l]}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400 font-mono">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-4">
        {programs.map(program => {
          const isOpen = openId === program.id;
          const totalSets = program.sessions.reduce(
            (acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets, 0),
            0
          );
          return (
            <motion.div layout key={program.id} className="glass-panel overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : program.id)}
                className="w-full text-left p-6 flex items-start justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-bold group-hover:text-accent transition-colors">{program.name}</h3>
                    <p className="text-xs text-brand/50 mt-1">{program.tagline}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{LEVEL_LABEL[program.level]}</Badge>
                    <Badge>{GOAL_LABEL[program.goal]}</Badge>
                    <Badge>{EQUIPMENT_LABEL[program.equipment]}</Badge>
                    <Badge>{program.daysPerWeek} buổi/tuần</Badge>
                  </div>
                </div>
                <ChevronDown
                  className={cn('w-5 h-5 mt-1 shrink-0 opacity-40 transition-transform', isOpen && 'rotate-180')}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-5 border-t border-white/5 pt-5">
                      <p className="text-sm text-brand/70 leading-relaxed">{program.description}</p>

                      <div className="flex items-start gap-2 text-xs text-brand/60">
                        <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
                        <span>
                          <span className="font-bold text-brand/80">Lịch gợi ý:</span> {program.schedule}
                        </span>
                      </div>

                      <div className="space-y-4">
                        {program.sessions.map((session, i) => {
                          const key = `${program.id}-${i}`;
                          const saved = savedKeys.has(key);
                          const saving = savingKey === key;
                          return (
                            <div key={key} className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <h4 className="font-bold">{session.name}</h4>
                                  <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40 mt-0.5">
                                    {session.focus}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSave(program, session, i)}
                                    disabled={saving || saved}
                                    className={cn(
                                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono uppercase tracking-wider border transition-all',
                                      saved
                                        ? 'border-green-500/30 text-green-400 bg-green-500/10'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-brand/70'
                                    )}
                                  >
                                    {saving ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : saved ? (
                                      <Check className="w-3.5 h-3.5" />
                                    ) : (
                                      <BookmarkPlus className="w-3.5 h-3.5" />
                                    )}
                                    {saved ? 'Đã lưu' : 'Lưu'}
                                  </button>
                                  <button
                                    onClick={() => handleStart(program, session, i)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono uppercase tracking-wider bg-accent text-white hover:bg-accent/80 transition-all active:scale-95"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-white" />
                                    Tập ngay
                                  </button>
                                </div>
                              </div>

                              <ul className="divide-y divide-white/5">
                                {session.exercises.map((e, j) => (
                                  <li key={j} className="py-2 flex items-start justify-between gap-3 text-sm">
                                    <div>
                                      <span>{e.name}</span>
                                      {e.notes && <p className="text-[11px] text-brand/40 mt-0.5">{e.notes}</p>}
                                    </div>
                                    <span className="font-mono text-xs text-accent shrink-0">
                                      {e.sets} × {e.reps}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand/40">
                          <Lightbulb className="w-3.5 h-3.5" /> Lời khuyên
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-brand/60">
                          {program.tips.map((tip, k) => (
                            <li key={k}>{tip}</li>
                          ))}
                        </ul>
                      </div>

                      <p className="text-[10px] font-mono uppercase tracking-widest text-brand/30">
                        {program.sessions.length} buổi • {totalSets} hiệp tổng cộng
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="px-2 py-1 bg-white/5 rounded-md text-[10px] font-mono uppercase text-brand/60">{children}</span>
  );
}
