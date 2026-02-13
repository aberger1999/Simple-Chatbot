import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Moon,
  Dumbbell,
  DollarSign,
  Apple,
  Sparkles,
  Flame,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightNav,
  Save,
  Plus,
  X,
  Trash2,
} from 'lucide-react';
import { habitsApi } from '../api/client';

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRESET_CATEGORIES = [
  { key: 'sleep', label: 'Sleep', icon: Moon },
  { key: 'fitness', label: 'Fitness', icon: Dumbbell },
  { key: 'finance', label: 'Finance', icon: DollarSign },
  { key: 'diet_health', label: 'Diet & Health', icon: Apple },
];

function isPresetCompleted(category, data) {
  if (!data) return false;
  if (category === 'sleep') return !!(data.bedtime && data.wakeTime);
  if (category === 'fitness') return !!(data.activityType && (data.duration || 0) > 0);
  if (category === 'finance') return data.dailySpend !== null && data.dailySpend !== undefined && data.dailySpend !== '';
  if (category === 'diet_health') return (data.waterIntake || 0) > 0 || !!data.meals;
  return false;
}

function isCustomCompleted(trackingType, value) {
  if (!value && value !== 0) return false;
  if (trackingType === 'checkbox') return value === 'true' || value === true;
  try {
    return parseFloat(value) > 0;
  } catch {
    return false;
  }
}

function calcHours(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60;
  return ((wakeMins - bedMins) / 60).toFixed(1);
}

// Star rating component
function StarRating({ value, onChange, max = 5 }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className={`w-6 h-6 rounded-full text-xs font-bold transition-colors ${
            i < value
              ? 'bg-primary text-white'
              : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
          }`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}

// 7-day completion dots
function WeekDots({ weekDates, isCompletedForDate }) {
  return (
    <div className="flex gap-1">
      {weekDates.map((d) => (
        <div
          key={d}
          className={`w-3 h-3 rounded-full ${
            isCompletedForDate(d)
              ? 'bg-green-500'
              : 'bg-gray-200 dark:bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

// Intensity toggle
function IntensityToggle({ value, onChange }) {
  const levels = ['low', 'medium', 'high'];
  return (
    <div className="flex gap-1">
      {levels.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`px-3 py-1 text-xs rounded-lg capitalize transition-colors ${
            value === l
              ? 'bg-primary text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const todayStr = formatDate(selectedDate);
  const monday = getMonday(selectedDate);
  const weekDateStr = formatDate(monday);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDate(d);
  });

  const { data: weekData, isLoading } = useQuery({
    queryKey: ['habits', 'week', weekDateStr],
    queryFn: () => habitsApi.getWeek(weekDateStr),
  });

  // Local form state for each preset category (today only)
  const [formState, setFormState] = useState({
    sleep: { bedtime: '', wakeTime: '', quality: 0 },
    fitness: { activityType: '', duration: '', intensity: 'medium', notes: '' },
    finance: { dailySpend: '', budgetLimit: '', spendCategory: 'food' },
    diet_health: { waterIntake: '', meals: '', moodRating: 0 },
  });
  const [isDirty, setIsDirty] = useState({});
  const [expanded, setExpanded] = useState({});
  const [customExpanded, setCustomExpanded] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', trackingType: 'checkbox', targetValue: '', unit: '', frequency: 'daily' });
  const [customValues, setCustomValues] = useState({});

  // Sync fetched data into form state when week data loads or date changes
  useEffect(() => {
    if (!weekData) return;
    const dayLogs = weekData.logs[todayStr] || {};
    setFormState({
      sleep: {
        bedtime: dayLogs.sleep?.data?.bedtime || '',
        wakeTime: dayLogs.sleep?.data?.wakeTime || '',
        quality: dayLogs.sleep?.data?.quality || 0,
      },
      fitness: {
        activityType: dayLogs.fitness?.data?.activityType || '',
        duration: dayLogs.fitness?.data?.duration || '',
        intensity: dayLogs.fitness?.data?.intensity || 'medium',
        notes: dayLogs.fitness?.data?.notes || '',
      },
      finance: {
        dailySpend: dayLogs.finance?.data?.dailySpend ?? '',
        budgetLimit: dayLogs.finance?.data?.budgetLimit ?? '',
        spendCategory: dayLogs.finance?.data?.spendCategory || 'food',
      },
      diet_health: {
        waterIntake: dayLogs.diet_health?.data?.waterIntake ?? '',
        meals: dayLogs.diet_health?.data?.meals || '',
        moodRating: dayLogs.diet_health?.data?.moodRating || 0,
      },
    });
    setIsDirty({});

    // Custom habit values
    const dayCustom = weekData.customLogs[todayStr] || {};
    const cv = {};
    for (const [hid, log] of Object.entries(dayCustom)) {
      cv[hid] = log.value || '';
    }
    setCustomValues(cv);
  }, [weekData, todayStr]);

  const updateField = (category, field, value) => {
    setFormState((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }));
    setIsDirty((prev) => ({ ...prev, [category]: true }));
  };

  const logPresetMutation = useMutation({
    mutationFn: ({ date, category, data }) => habitsApi.logPreset(date, category, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const savePreset = (category) => {
    const data = { ...formState[category] };
    if (category === 'sleep') {
      data.hours = calcHours(data.bedtime, data.wakeTime);
    }
    logPresetMutation.mutate({ date: todayStr, category, data });
    setIsDirty((prev) => ({ ...prev, [category]: false }));
  };

  const logCustomMutation = useMutation({
    mutationFn: ({ date, habitId, value }) => habitsApi.logCustom(date, habitId, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const saveCustom = (habitId) => {
    logCustomMutation.mutate({ date: todayStr, habitId, value: customValues[habitId] || '' });
  };

  const createHabitMutation = useMutation({
    mutationFn: (data) => habitsApi.createCustomHabit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setShowAddHabit(false);
      setNewHabit({ name: '', trackingType: 'checkbox', targetValue: '', unit: '', frequency: 'daily' });
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: (id) => habitsApi.deleteCustomHabit(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  const navigateWeek = (offset) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7 * offset);
      return next;
    });
  };

  const goToThisWeek = () => setSelectedDate(new Date());

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // Weekly summary calculations
  const totalCategories = PRESET_CATEGORIES.length + (weekData?.customHabits?.length || 0);
  const dailyCompletions = weekDates.map((dateStr) => {
    const dayLogs = weekData?.logs[dateStr] || {};
    const dayCustom = weekData?.customLogs[dateStr] || {};
    let completed = 0;
    PRESET_CATEGORIES.forEach(({ key }) => {
      if (dayLogs[key]?.isCompleted) completed++;
    });
    (weekData?.customHabits || []).forEach((h) => {
      const cl = dayCustom[String(h.id)];
      if (cl && isCustomCompleted(h.trackingType, cl.value)) completed++;
    });
    return completed;
  });

  const weekTotal = dailyCompletions.reduce((a, b) => a + b, 0);
  const weekMax = totalCategories * 7;
  const weekPercent = weekMax > 0 ? Math.round((weekTotal / weekMax) * 100) : 0;

  const isCurrentWeek = formatDate(getMonday(new Date())) === weekDateStr;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Habits</h1>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 rounded-lg bg-white dark:bg-slate-800 border dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {new Date(weekDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' – '}
          {new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <button
          onClick={() => navigateWeek(1)}
          className="p-2 rounded-lg bg-white dark:bg-slate-800 border dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronRightNav size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        {!isCurrentWeek && (
          <button
            onClick={goToThisWeek}
            className="px-3 py-2 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            This Week
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Weekly Summary Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Weekly Consistency
              </h2>
              <span className="text-lg font-bold text-primary">{weekPercent}%</span>
            </div>
            <div className="flex items-end gap-2 h-20">
              {weekDates.map((dateStr, i) => {
                const pct = totalCategories > 0
                  ? (dailyCompletions[i] / totalCategories) * 100
                  : 0;
                const isToday = dateStr === formatDate(new Date());
                return (
                  <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: '48px' }}>
                      <div
                        className={`w-full max-w-8 rounded-t transition-all ${
                          isToday ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-slate-900' : ''
                        }`}
                        style={{
                          height: `${Math.max(pct * 0.48, 2)}px`,
                          backgroundColor: pct > 75 ? '#22c55e' : pct > 50 ? '#84cc16' : pct > 25 ? '#eab308' : pct > 0 ? '#f97316' : '#e5e7eb',
                        }}
                      />
                    </div>
                    <span className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-gray-400'}`}>
                      {DAY_LABELS[i]}
                    </span>
                    <span className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-gray-400'}`}>
                      {new Date(dateStr + 'T00:00:00').getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preset Category Cards */}
          {PRESET_CATEGORIES.map(({ key, label, icon: Icon }) => {
            const streak = weekData?.streaks?.[key] || 0;
            const isOpen = expanded[key];
            const form = formState[key];
            const dirty = isDirty[key];

            return (
              <div key={key} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 mb-4">
                {/* Header */}
                <button
                  onClick={() => toggle(key)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <Icon size={20} className="text-primary shrink-0" />
                  <span className="font-medium text-gray-800 dark:text-gray-100 flex-1">{label}</span>
                  {streak > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full">
                      <Flame size={12} /> {streak} day{streak !== 1 ? 's' : ''}
                    </span>
                  )}
                  <WeekDots
                    weekDates={weekDates}
                    isCompletedForDate={(d) => {
                      const log = weekData?.logs[d]?.[key];
                      return log?.isCompleted || false;
                    }}
                  />
                  {isOpen ? (
                    <ChevronDown size={18} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-400 shrink-0" />
                  )}
                </button>

                {/* Collapsible Body */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t dark:border-slate-800 pt-4">
                    {key === 'sleep' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bedtime</label>
                          <input
                            type="time"
                            value={form.bedtime}
                            onChange={(e) => updateField('sleep', 'bedtime', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Wake Time</label>
                          <input
                            type="time"
                            value={form.wakeTime}
                            onChange={(e) => updateField('sleep', 'wakeTime', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hours</label>
                          <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm text-gray-600 dark:text-gray-300">
                            {calcHours(form.bedtime, form.wakeTime) || '—'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quality</label>
                          <StarRating value={form.quality} onChange={(v) => updateField('sleep', 'quality', v)} />
                        </div>
                      </div>
                    )}

                    {key === 'fitness' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Activity Type</label>
                          <input
                            type="text"
                            value={form.activityType}
                            onChange={(e) => updateField('fitness', 'activityType', e.target.value)}
                            placeholder="e.g., Running, Weights, Yoga"
                            className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
                            <input
                              type="number"
                              value={form.duration}
                              onChange={(e) => updateField('fitness', 'duration', e.target.value ? Number(e.target.value) : '')}
                              min="0"
                              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Intensity</label>
                            <IntensityToggle value={form.intensity} onChange={(v) => updateField('fitness', 'intensity', v)} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                          <textarea
                            value={form.notes}
                            onChange={(e) => updateField('fitness', 'notes', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm resize-y"
                          />
                        </div>
                      </div>
                    )}

                    {key === 'finance' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Daily Spend</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                            <input
                              type="number"
                              value={form.dailySpend}
                              onChange={(e) => updateField('finance', 'dailySpend', e.target.value === '' ? '' : Number(e.target.value))}
                              min="0"
                              step="0.01"
                              className="w-full pl-7 pr-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Budget Limit</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                            <input
                              type="number"
                              value={form.budgetLimit}
                              onChange={(e) => updateField('finance', 'budgetLimit', e.target.value === '' ? '' : Number(e.target.value))}
                              min="0"
                              step="0.01"
                              className="w-full pl-7 pr-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                          <select
                            value={form.spendCategory}
                            onChange={(e) => updateField('finance', 'spendCategory', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="food">Food</option>
                            <option value="transport">Transport</option>
                            <option value="entertainment">Entertainment</option>
                            <option value="shopping">Shopping</option>
                            <option value="bills">Bills</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {key === 'diet_health' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Water Intake (glasses)</label>
                            <input
                              type="number"
                              value={form.waterIntake}
                              onChange={(e) => updateField('diet_health', 'waterIntake', e.target.value === '' ? '' : Number(e.target.value))}
                              min="0"
                              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mood</label>
                            <StarRating value={form.moodRating} onChange={(v) => updateField('diet_health', 'moodRating', v)} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Meals</label>
                          <textarea
                            value={form.meals}
                            onChange={(e) => updateField('diet_health', 'meals', e.target.value)}
                            placeholder="Breakfast: ..., Lunch: ..., Dinner: ..."
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm resize-y"
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => savePreset(key)}
                        disabled={!dirty || logPresetMutation.isPending}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          dirty
                            ? 'bg-primary hover:bg-primary-dark text-white'
                            : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Save size={14} />
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Custom Habits Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 mb-4">
            <button
              onClick={() => setCustomExpanded(!customExpanded)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <Sparkles size={20} className="text-primary shrink-0" />
              <span className="font-medium text-gray-800 dark:text-gray-100 flex-1">Custom</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomExpanded(true);
                  setShowAddHabit(true);
                }}
                className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors"
              >
                <Plus size={12} /> Add Habit
              </button>
              {customExpanded ? (
                <ChevronDown size={18} className="text-gray-400 shrink-0" />
              ) : (
                <ChevronRight size={18} className="text-gray-400 shrink-0" />
              )}
            </button>

            {customExpanded && (
              <div className="px-4 pb-4 border-t dark:border-slate-800 pt-4 space-y-3">
                {(weekData?.customHabits || []).length === 0 && !showAddHabit && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No custom habits yet. Click "Add Habit" to create one.
                  </p>
                )}

                {(weekData?.customHabits || []).map((habit) => {
                  const hid = String(habit.id);
                  const value = customValues[hid] || '';
                  const streak = weekData?.streaks?.[`custom_${habit.id}`] || 0;

                  return (
                    <div key={habit.id} className="flex items-center gap-3 py-2 border-b dark:border-slate-800 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{habit.name}</span>
                          {streak > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-orange-500">
                              <Flame size={10} /> {streak}
                            </span>
                          )}
                        </div>
                        {habit.targetValue && (
                          <span className="text-xs text-gray-400">
                            Target: {habit.targetValue} {habit.unit || ''}
                          </span>
                        )}
                      </div>

                      {/* Input matching tracking type */}
                      <div className="shrink-0">
                        {habit.trackingType === 'checkbox' && (
                          <button
                            onClick={() => {
                              const newVal = value === 'true' ? 'false' : 'true';
                              setCustomValues((prev) => ({ ...prev, [hid]: newVal }));
                              logCustomMutation.mutate({ date: todayStr, habitId: habit.id, value: newVal });
                            }}
                            className={`w-8 h-5 rounded-full transition-colors relative ${
                              value === 'true' ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
                            }`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              value === 'true' ? 'translate-x-3.5' : 'translate-x-0.5'
                            }`} />
                          </button>
                        )}
                        {(habit.trackingType === 'number' || habit.trackingType === 'duration') && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => setCustomValues((prev) => ({ ...prev, [hid]: e.target.value }))}
                              min="0"
                              className="w-20 px-2 py-1 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            />
                            {habit.unit && <span className="text-xs text-gray-400">{habit.unit}</span>}
                            <button
                              onClick={() => saveCustom(habit.id)}
                              className="p-1 text-primary hover:text-primary-dark"
                            >
                              <Save size={14} />
                            </button>
                          </div>
                        )}
                        {habit.trackingType === 'rating' && (
                          <div className="flex items-center gap-1">
                            <StarRating
                              value={parseInt(value) || 0}
                              onChange={(v) => {
                                setCustomValues((prev) => ({ ...prev, [hid]: String(v) }));
                                logCustomMutation.mutate({ date: todayStr, habitId: habit.id, value: String(v) });
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <WeekDots
                        weekDates={weekDates}
                        isCompletedForDate={(d) => {
                          const cl = weekData?.customLogs[d]?.[hid];
                          return cl ? isCustomCompleted(habit.trackingType, cl.value) : false;
                        }}
                      />

                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${habit.name}"?`)) {
                            deleteHabitMutation.mutate(habit.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

                {/* Add Habit Form */}
                {showAddHabit && (
                  <div className="border dark:border-slate-700 rounded-lg p-3 space-y-3 bg-gray-50 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">New Custom Habit</span>
                      <button onClick={() => setShowAddHabit(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newHabit.name}
                      onChange={(e) => setNewHabit((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Habit name"
                      className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tracking Type</label>
                        <select
                          value={newHabit.trackingType}
                          onChange={(e) => setNewHabit((p) => ({ ...p, trackingType: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="checkbox">Checkbox</option>
                          <option value="number">Number</option>
                          <option value="duration">Duration</option>
                          <option value="rating">Rating (1-5)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                        <select
                          value={newHabit.frequency}
                          onChange={(e) => setNewHabit((p) => ({ ...p, frequency: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                      {(newHabit.trackingType === 'number' || newHabit.trackingType === 'duration') && (
                        <>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Target Value</label>
                            <input
                              type="number"
                              value={newHabit.targetValue}
                              onChange={(e) => setNewHabit((p) => ({ ...p, targetValue: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Unit</label>
                            <input
                              type="text"
                              value={newHabit.unit}
                              onChange={(e) => setNewHabit((p) => ({ ...p, unit: e.target.value }))}
                              placeholder="e.g., pages, hours"
                              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (!newHabit.name.trim()) return;
                        createHabitMutation.mutate({
                          name: newHabit.name,
                          trackingType: newHabit.trackingType,
                          targetValue: newHabit.targetValue ? Number(newHabit.targetValue) : null,
                          unit: newHabit.unit || null,
                          frequency: newHabit.frequency,
                        });
                      }}
                      disabled={!newHabit.name.trim() || createHabitMutation.isPending}
                      className="w-full py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      Create Habit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
