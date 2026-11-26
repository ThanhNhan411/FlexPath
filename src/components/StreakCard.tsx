import { useMemo, useState } from 'react';
import { Flame, Target, Settings2, Bell, BellOff, Minus, Plus, Check } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  MAX_WEEKLY_GOAL,
  MIN_WEEKLY_GOAL,
  WorkoutLike,
  clampGoal,
  streakInfo,
  weekProgress,
} from '../lib/streak';
import { ReminderSettings, SETTINGS_EVENT, loadSettings, saveSettings } from '../lib/reminders';
import { notifySystem } from '../hooks/useWorkoutReminders';
import { cn } from '../lib/utils';

interface StreakCardProps {
  workouts: WorkoutLike[];
  initialGoal: number;
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
/** Reminder day values (0 = Sunday) in Monday-first display order. */
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

export default function StreakCard({ workouts, initialGoal }: StreakCardProps) {
  const uid = auth.currentUser?.uid ?? '';
  const [goal, setGoal] = useState(clampGoal(initialGoal));
  const [showSettings, setShowSettings] = useState(false);
  const [reminder, setReminder] = useState<ReminderSettings>(() => loadSettings(localStorage, uid));
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );
  const [notice, setNotice] = useState<string | null>(null);

  const streak = useMemo(() => streakInfo(workouts), [workouts]);
  const week = useMemo(() => weekProgress(workouts, goal), [workouts, goal]);

  const changeGoal = async (next: number) => {
    const value = clampGoal(next);
    if (value === goal) return;
    setGoal(value);
    try {
      await setDoc(doc(db, 'health_profiles', uid), { weeklyGoal: value, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.error('Error saving weekly goal:', e);
      setNotice('Không lưu được mục tiêu tuần.');
    }
  };

  const updateReminder = (patch: Partial<ReminderSettings>) => {
    const next = { ...reminder, ...patch };
    setReminder(next);
    saveSettings(localStorage, uid, next);
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  };

  const ensurePermission = async () => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return Notification.permission === 'granted';
  };

  const toggleReminder = async () => {
    const enabling = !reminder.enabled;
    updateReminder({ enabled: enabling });
    if (enabling) await ensurePermission();
  };

  const sendTest = async () => {
    setNotice(null);
    if (!(await ensurePermission())) {
      setNotice(
        permission === 'unsupported'
          ? 'Trình duyệt này không hỗ trợ thông báo, bạn vẫn nhận lời nhắc trong app.'
          : 'Thông báo đang bị chặn. Hãy cho phép thông báo trong cài đặt trình duyệt.'
      );
      return;
    }
    const ok = notifySystem('FlexPath', 'Thông báo hoạt động bình thường!', true);
    setNotice(ok ? 'Đã gửi thông báo thử.' : 'Không gửi được thông báo hệ thống, lời nhắc sẽ hiện trong app.');
  };

  const toggleDay = (day: number) => {
    const has = reminder.days.includes(day);
    updateReminder({ days: has ? reminder.days.filter(d => d !== day) : [...reminder.days, day].sort() });
  };

  const pct = Math.min(100, Math.round((week.done / week.goal) * 100));

  return (
    <div className="glass-panel p-6 border border-white/5 space-y-6">
      <div className="flex flex-col md:flex-row gap-6 md:items-center">
        {/* Streak */}
        <div className="flex items-center gap-4 md:w-1/3">
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center shrink-0',
              streak.current > 0 ? 'bg-orange-500/15 text-orange-400' : 'bg-white/5 text-brand/30'
            )}
          >
            <Flame className={cn('w-9 h-9', streak.current > 0 && 'animate-pulse')} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Chuỗi ngày tập</p>
            <p className="text-3xl font-black leading-none mt-1">
              {streak.current} <span className="text-sm font-medium text-brand/40">ngày</span>
            </p>
            <p className="text-[11px] text-brand/40 mt-1">Kỷ lục: {streak.longest} ngày</p>
          </div>
        </div>

        {/* Weekly goal */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand/40">
              <Target className="w-3.5 h-3.5" /> Mục tiêu tuần
            </p>
            <p className="font-mono text-sm">
              <span className="font-black text-accent">{week.done}</span>
              <span className="text-brand/40"> / {week.goal} buổi</span>
            </p>
          </div>

          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', week.reached ? 'bg-emerald-400' : 'bg-accent')}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {week.days.map((d, i) => (
              <div
                key={d.key}
                className={cn(
                  'flex flex-col items-center py-1.5 rounded-lg text-[10px] font-mono border',
                  d.done
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : d.isToday
                      ? 'border-accent/50 text-accent'
                      : 'bg-white/[0.03] border-white/5 text-brand/30'
                )}
              >
                {DAY_LABELS[i]}
                {d.done ? <Check className="w-3 h-3 mt-0.5" /> : <span className="h-3 mt-0.5" />}
              </div>
            ))}
          </div>

          <p className={cn('text-xs', week.reached ? 'text-emerald-400' : !week.reachable ? 'text-amber-400' : 'text-brand/50')}>
            {week.reached
              ? 'Bạn đã đạt mục tiêu tuần này. Tuyệt vời!'
              : !week.reachable
                ? `Còn ${week.remaining} buổi nhưng tuần này không đủ ngày. Hãy thử giảm mục tiêu hoặc cố gắng tuần sau.`
                : `Còn ${week.remaining} buổi trong ${week.daysLeft} ngày.`}
            {streak.atRisk && streak.current >= 2 && ` Tập hôm nay để giữ chuỗi ${streak.current} ngày!`}
          </p>
        </div>

        <button
          onClick={() => setShowSettings(v => !v)}
          aria-label="Cài đặt mục tiêu và nhắc nhở"
          aria-expanded={showSettings}
          className={cn(
            'self-start p-2.5 rounded-lg border transition-colors',
            showSettings ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-white/10 text-brand/50 hover:text-brand'
          )}
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {showSettings && (
        <div className="border-t border-white/5 pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Mục tiêu mỗi tuần</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => changeGoal(goal - 1)}
                disabled={goal <= MIN_WEEKLY_GOAL}
                aria-label="Giảm mục tiêu"
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono text-xl font-black w-16 text-center">{goal} buổi</span>
              <button
                onClick={() => changeGoal(goal + 1)}
                disabled={goal >= MAX_WEEKLY_GOAL}
                aria-label="Tăng mục tiêu"
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand/40">
                {reminder.enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />} Nhắc tập luyện
              </p>
              <button
                onClick={toggleReminder}
                role="switch"
                aria-checked={reminder.enabled}
                aria-label="Bật nhắc tập luyện"
                className={cn('relative w-11 h-6 rounded-full transition-colors', reminder.enabled ? 'bg-accent' : 'bg-white/10')}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                    reminder.enabled && 'translate-x-5'
                  )}
                />
              </button>
            </div>

            {reminder.enabled && (
              <>
                <label className="flex items-center gap-3 text-xs text-brand/60">
                  Giờ nhắc
                  <input
                    type="time"
                    value={reminder.time}
                    onChange={e => e.target.value && updateReminder({ time: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                  />
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {DAY_VALUES.map((value, i) => (
                    <button
                      key={value}
                      onClick={() => toggleDay(value)}
                      aria-pressed={reminder.days.includes(value)}
                      className={cn(
                        'w-9 h-9 rounded-lg text-[10px] font-mono border transition-all',
                        reminder.days.includes(value)
                          ? 'bg-accent border-accent text-white'
                          : 'bg-white/5 border-white/10 text-brand/50'
                      )}
                    >
                      {DAY_LABELS[i]}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={sendTest}
                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono uppercase tracking-wider"
                  >
                    Gửi thông báo thử
                  </button>
                  <span className="text-[10px] text-brand/40">
                    {permission === 'granted'
                      ? 'Đã cho phép thông báo'
                      : permission === 'denied'
                        ? 'Thông báo bị chặn'
                        : permission === 'unsupported'
                          ? 'Trình duyệt không hỗ trợ thông báo'
                          : 'Chưa cấp quyền thông báo'}
                  </span>
                </div>
                <p className="text-[10px] text-brand/30 leading-relaxed">
                  Lời nhắc hiện trong app, và thành thông báo hệ thống khi app đang mở ở tab nền. Khi đã đóng hẳn app thì chưa nhắc được.
                </p>
              </>
            )}
          </div>

          {notice && <p className="md:col-span-2 text-xs text-amber-400">{notice}</p>}
        </div>
      )}
    </div>
  );
}
