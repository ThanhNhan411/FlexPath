import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { dayKey, streakInfo, weekProgress, DEFAULT_WEEKLY_GOAL, clampGoal, WorkoutLike } from '../lib/streak';
import { SETTINGS_EVENT, isReminderTime, lastShownKey, loadSettings, reminderMessage } from '../lib/reminders';

export interface DueReminder {
  title: string;
  body: string;
}

const CHECK_INTERVAL_MS = 60_000;

/** Show a system notification when the page is in the background; the in-app banner covers the foreground. */
export function notifySystem(title: string, body: string, force = false): boolean {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    if (!force && document.visibilityState === 'visible') return false;
    new Notification(title, { body, icon: '/logo.png', tag: 'flexpath-reminder' });
    return true;
  } catch {
    // Some mobile browsers only allow notifications through a service worker.
    return false;
  }
}

/**
 * Fires a once-a-day workout reminder at the user's chosen time while the app is open (foreground or a
 * background tab). Real push while the app is closed would need a server (FCM + scheduler).
 */
export function useWorkoutReminders(user: User | null) {
  const [reminder, setReminder] = useState<DueReminder | null>(null);
  const checking = useRef(false);

  const check = useCallback(async () => {
    if (!user || checking.current) return;
    const now = new Date();
    const settings = loadSettings(localStorage, user.uid);
    const lastShown = localStorage.getItem(lastShownKey(user.uid));
    // Cheap local check first so we only touch Firestore when a reminder could actually fire.
    if (!isReminderTime(now, settings, lastShown)) return;

    checking.current = true;
    try {
      const snap = await getDocs(
        query(collection(db, 'workouts'), where('userId', '==', user.uid), orderBy('startTime', 'desc'), limit(60))
      );
      const workouts = snap.docs.map(d => d.data() as WorkoutLike);

      // Decided for today either way, so we do not query again every minute.
      localStorage.setItem(lastShownKey(user.uid), dayKey(now));

      const streak = streakInfo(workouts, now);
      if (streak.doneToday) return;

      let goal = DEFAULT_WEEKLY_GOAL;
      try {
        const profile = await getDoc(doc(db, 'health_profiles', user.uid));
        if (profile.exists()) goal = clampGoal(profile.data().weeklyGoal);
      } catch {
        /* default goal is fine */
      }
      const week = weekProgress(workouts, goal, now);

      const message = reminderMessage({
        streak: streak.current,
        atRisk: streak.atRisk,
        weekDone: week.done,
        weekGoal: week.goal,
      });
      setReminder(message);
      notifySystem(message.title, message.body);
    } catch (e) {
      console.error('Reminder check failed:', e);
    } finally {
      checking.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setReminder(null);
      return;
    }
    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(SETTINGS_EVENT, check);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(SETTINGS_EVENT, check);
    };
  }, [user, check]);

  const dismiss = useCallback(() => setReminder(null), []);
  return { reminder, dismiss };
}
