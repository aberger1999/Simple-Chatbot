import { Pencil, Trash2, Flame } from 'lucide-react';
import { calcHours, PRESET_CATEGORIES } from '../utils/habits';
import { MOOD_EMOJI_MAP } from './habits/MoodSelector';
import { getIconComponent } from './IconPicker';

function formatSummary(category, data) {
  if (!data) return 'No data';

  if (category === 'sleep') {
    const hours = calcHours(data.bedtime, data.wakeTime);
    const bed = data.bedtime || '?';
    const wake = data.wakeTime || '?';
    let s = `${bed} - ${wake}`;
    if (hours) s += ` \u00B7 ${hours} hrs`;
    if (data.quality) s += ` \u00B7 Quality: ${data.quality}/5`;
    return s;
  }

  if (category === 'fitness') {
    const parts = [];
    if (data.activityType) parts.push(data.activityType);
    if (data.duration) parts.push(`${data.duration} min`);
    if (data.intensity) parts.push(data.intensity.charAt(0).toUpperCase() + data.intensity.slice(1));
    let s = parts.join(' \u00B7 ');
    if (data.notes) s += ` \u2014 ${data.notes}`;
    return s || 'Tracked';
  }

  if (category === 'diet_health') {
    const parts = [];
    if (data.waterIntake) parts.push(`${data.waterIntake}/8 glasses`);
    if (data.moodRating) parts.push(`Mood: ${MOOD_EMOJI_MAP[data.moodRating] || data.moodRating}`);
    // Handle both string (old) and object (new) meal formats
    if (data.meals) {
      if (typeof data.meals === 'object') {
        const mealCount = Object.values(data.meals).filter(Boolean).length;
        if (mealCount > 0) parts.push(`${mealCount} meals logged`);
      } else {
        parts.push('Meals logged');
      }
    }
    return parts.join(' \u00B7 ') || 'Tracked';
  }

  return 'Tracked';
}

function formatCustomSummary(habit, value) {
  if (habit.trackingType === 'checkbox') {
    return value === 'true' ? 'Completed' : 'Not done';
  }
  if (habit.trackingType === 'rating') {
    return `Rating: ${value}/5`;
  }
  const parts = [value];
  if (habit.unit) parts.push(habit.unit);
  if (habit.targetValue) parts.push(`/ ${habit.targetValue}`);
  return parts.join(' ');
}

export default function HabitEntryCard({ entry, onEdit, onDelete }) {
  const { type, category, data, habit, value, streak } = entry;

  const isPreset = type === 'preset';
  let Icon, colorClass, title, summary;

  if (isPreset) {
    const cat = PRESET_CATEGORIES.find((c) => c.key === category);
    Icon = cat?.icon;
    colorClass = cat?.color || 'text-gray-500 bg-gray-100 dark:bg-slate-700';
    title = cat?.label || category;
    summary = formatSummary(category, data);
  } else {
    Icon = getIconComponent(habit?.icon);
    colorClass = 'text-purple-500 bg-purple-100 dark:bg-purple-500/20';
    title = habit?.name || 'Custom';
    summary = formatCustomSummary(habit, value);
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        {Icon && <Icon size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{title}</span>
          {streak > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded-full">
              <Flame size={10} /> {streak}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{summary}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
