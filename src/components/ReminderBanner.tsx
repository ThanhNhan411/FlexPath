import { motion } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { DueReminder } from '../hooks/useWorkoutReminders';

interface ReminderBannerProps {
  reminder: DueReminder;
  onStart: () => void;
  onDismiss: () => void;
}

export default function ReminderBanner({ reminder, onStart, onDismiss }: ReminderBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      role="status"
      className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[90] glass-panel p-4 border border-accent/40 shadow-2xl shadow-accent/10 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-accent/20 text-accent shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold">{reminder.title}</p>
          <p className="text-xs text-brand/60 mt-0.5 leading-relaxed">{reminder.body}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onStart}
              className="px-4 py-2 rounded-lg bg-accent text-white text-[11px] font-mono uppercase tracking-wider active:scale-95"
            >
              Tập ngay
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono uppercase tracking-wider text-brand/60"
            >
              Để sau
            </button>
          </div>
        </div>
        <button onClick={onDismiss} aria-label="Đóng" className="p-1 text-brand/40 hover:text-brand">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
