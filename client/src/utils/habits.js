import { Moon, Dumbbell, Apple } from 'lucide-react';

export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function calcHours(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60;
  return ((wakeMins - bedMins) / 60).toFixed(1);
}

export function isPresetCompleted(category, data) {
  if (!data) return false;
  if (category === 'sleep') return !!(data.bedtime && data.wakeTime);
  if (category === 'fitness') return !!(data.activityType && (data.duration || 0) > 0);
  if (category === 'finance') return data.dailySpend !== null && data.dailySpend !== undefined && data.dailySpend !== '';
  if (category === 'diet_health') return (data.waterIntake || 0) > 0 || !!data.meals;
  return false;
}

export function isCustomCompleted(trackingType, value) {
  if (!value && value !== 0) return false;
  if (trackingType === 'checkbox') return value === 'true' || value === true;
  try {
    return parseFloat(value) > 0;
  } catch {
    return false;
  }
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const PRESET_CATEGORIES = [
  { key: 'sleep', label: 'Sleep', icon: Moon, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-500/20' },
  { key: 'fitness', label: 'Fitness', icon: Dumbbell, color: 'text-green-500 bg-green-100 dark:bg-green-500/20' },
  { key: 'diet_health', label: 'Diet & Health', icon: Apple, color: 'text-rose-500 bg-rose-100 dark:bg-rose-500/20' },
];
