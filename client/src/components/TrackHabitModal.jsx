import { useState, useEffect } from 'react';
import { X, ArrowLeft, Moon, Dumbbell, Apple, Sparkles } from 'lucide-react';
import StarRating from './habits/StarRating';
import IntensityToggle from './habits/IntensityToggle';
import GlassCounter from './habits/GlassCounter';
import MoodSelector from './habits/MoodSelector';
import ActivityChips from './habits/ActivityChips';
import IconPicker from './IconPicker';
import { calcHours } from '../utils/habits';

const CATEGORY_TILES = [
  { key: 'sleep', label: 'Sleep', icon: Moon, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30' },
  { key: 'fitness', label: 'Fitness', icon: Dumbbell, color: 'text-green-500 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30' },
  { key: 'diet_health', label: 'Diet & Health', icon: Apple, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30' },
  { key: 'custom', label: 'Custom', icon: Sparkles, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30' },
];

function getInitialForm(category, editData) {
  if (editData) return { ...editData };

  switch (category) {
    case 'sleep':
      return { bedtime: '', wakeTime: '', quality: 0 };
    case 'fitness':
      return { activityType: '', duration: '', intensity: 'medium', notes: '' };
    case 'diet_health':
      return { waterIntake: 0, meals: { breakfast: '', lunch: '', dinner: '', snacks: '' }, moodRating: 0 };
    case 'custom':
      return { habitId: null, value: '', newHabit: false, name: '', icon: '', trackingType: 'checkbox', targetValue: '', unit: '' };
    default:
      return {};
  }
}

function normalizeDietData(data) {
  if (!data) return { waterIntake: 0, meals: { breakfast: '', lunch: '', dinner: '', snacks: '' }, moodRating: 0 };
  const meals = data.meals;
  let normalizedMeals;
  if (typeof meals === 'string') {
    normalizedMeals = { breakfast: '', lunch: '', dinner: '', snacks: meals };
  } else if (meals && typeof meals === 'object') {
    normalizedMeals = { breakfast: meals.breakfast || '', lunch: meals.lunch || '', dinner: meals.dinner || '', snacks: meals.snacks || '' };
  } else {
    normalizedMeals = { breakfast: '', lunch: '', dinner: '', snacks: '' };
  }
  return { waterIntake: data.waterIntake || 0, meals: normalizedMeals, moodRating: data.moodRating || 0 };
}

export default function TrackHabitModal({ open, onClose, onSave, onDelete, editingEntry, customHabits }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!open) return;
    if (editingEntry) {
      const cat = editingEntry.type === 'preset' ? editingEntry.category : 'custom';
      setCategory(cat);
      setStep(2);
      if (cat === 'diet_health') {
        setForm(normalizeDietData(editingEntry.data));
      } else if (cat === 'custom') {
        setForm({ habitId: editingEntry.habit?.id, value: editingEntry.value || '', newHabit: false });
      } else {
        setForm(getInitialForm(cat, editingEntry.data));
      }
    } else {
      setStep(1);
      setCategory(null);
      setForm({});
    }
  }, [open, editingEntry]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const selectCategory = (key) => {
    setCategory(key);
    setStep(2);
    if (key === 'diet_health') {
      setForm(normalizeDietData(null));
    } else {
      setForm(getInitialForm(key));
    }
  };

  const goBack = () => {
    setStep(1);
    setCategory(null);
    setForm({});
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (category === 'sleep') {
      const data = { ...form, hours: calcHours(form.bedtime, form.wakeTime) };
      onSave({ type: 'preset', category: 'sleep', data });
    } else if (category === 'fitness') {
      onSave({ type: 'preset', category: 'fitness', data: form });
    } else if (category === 'diet_health') {
      onSave({ type: 'preset', category: 'diet_health', data: form });
    } else if (category === 'custom') {
      if (form.newHabit) {
        onSave({ type: 'newCustom', name: form.name, icon: form.icon, trackingType: form.trackingType, targetValue: form.targetValue ? Number(form.targetValue) : null, unit: form.unit || null });
      } else {
        onSave({ type: 'custom', habitId: form.habitId, value: form.value });
      }
    }
  };

  const canSave = () => {
    if (category === 'sleep') return !!(form.bedtime && form.wakeTime);
    if (category === 'fitness') return !!(form.activityType && form.duration);
    if (category === 'diet_health') return true;
    if (category === 'custom') {
      if (form.newHabit) return !!form.name?.trim();
      return !!form.habitId;
    }
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800">
          <div className="flex items-center gap-2">
            {step === 2 && !editingEntry && (
              <button onClick={goBack} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft size={18} className="text-gray-500" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingEntry ? 'Edit Entry' : step === 1 ? 'Track Habit' : CATEGORY_TILES.find((c) => c.key === category)?.label}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          {/* Step 1: Category Picker */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {CATEGORY_TILES.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => selectCategory(key)}
                  className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all hover:scale-[1.02] ${color}`}
                >
                  <Icon size={28} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Category Form */}
          {step === 2 && category === 'sleep' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bedtime</label>
                  <input
                    type="time"
                    value={form.bedtime || ''}
                    onChange={(e) => update('bedtime', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Wake Time</label>
                  <input
                    type="time"
                    value={form.wakeTime || ''}
                    onChange={(e) => update('wakeTime', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              {form.bedtime && form.wakeTime && (
                <div className="text-center py-2 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                  {calcHours(form.bedtime, form.wakeTime)} hours of sleep
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sleep Quality</label>
                <StarRating value={form.quality || 0} onChange={(v) => update('quality', v)} />
              </div>
            </div>
          )}

          {step === 2 && category === 'fitness' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Activity</label>
                <ActivityChips value={form.activityType || ''} onChange={(v) => update('activityType', v)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={form.duration || ''}
                    onChange={(e) => update('duration', e.target.value ? Number(e.target.value) : '')}
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Intensity</label>
                  <IntensityToggle value={form.intensity || 'medium'} onChange={(v) => update('intensity', v)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <textarea
                  value={form.notes || ''}
                  onChange={(e) => update('notes', e.target.value)}
                  rows={2}
                  placeholder="How did it go?"
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm resize-y"
                />
              </div>
            </div>
          )}

          {step === 2 && category === 'diet_health' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Water Intake</label>
                <GlassCounter value={form.waterIntake || 0} onChange={(v) => update('waterIntake', v)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Mood</label>
                <MoodSelector value={form.moodRating || 0} onChange={(v) => update('moodRating', v)} />
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Meals</label>
                {['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => (
                  <div key={meal}>
                    <label className="block text-[11px] text-gray-400 dark:text-gray-500 mb-0.5 capitalize">{meal}</label>
                    <input
                      type="text"
                      value={form.meals?.[meal] || ''}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        meals: { ...prev.meals, [meal]: e.target.value },
                      }))}
                      placeholder={`What did you have for ${meal}?`}
                      className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && category === 'custom' && (
            <div className="space-y-4">
              {!form.newHabit ? (
                <>
                  {(customHabits || []).length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Select Habit</label>
                      {customHabits.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => update('habitId', h.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                            form.habitId === h.id
                              ? 'border-primary bg-primary/5 dark:bg-primary/10'
                              : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{h.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{h.trackingType}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {form.habitId && (() => {
                    const habit = customHabits?.find((h) => h.id === form.habitId);
                    if (!habit) return null;
                    return (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Value</label>
                        {habit.trackingType === 'checkbox' ? (
                          <button
                            onClick={() => update('value', form.value === 'true' ? 'false' : 'true')}
                            className={`w-10 h-6 rounded-full transition-colors relative ${
                              form.value === 'true' ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
                            }`}
                          >
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              form.value === 'true' ? 'translate-x-5' : 'translate-x-1'
                            }`} />
                          </button>
                        ) : habit.trackingType === 'rating' ? (
                          <StarRating value={parseInt(form.value) || 0} onChange={(v) => update('value', String(v))} />
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={form.value || ''}
                              onChange={(e) => update('value', e.target.value)}
                              min="0"
                              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            />
                            {habit.unit && <span className="text-xs text-gray-400 shrink-0">{habit.unit}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => update('newHabit', true)}
                    className="w-full py-2 text-sm text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors"
                  >
                    + Define New Habit
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Habit Name</label>
                    <input
                      type="text"
                      value={form.name || ''}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="e.g., Read 30 minutes"
                      className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Icon</label>
                    <IconPicker value={form.icon || ''} onChange={(v) => update('icon', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                      <select
                        value={form.trackingType || 'checkbox'}
                        onChange={(e) => update('trackingType', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="checkbox">Checkbox</option>
                        <option value="number">Number</option>
                        <option value="duration">Duration</option>
                        <option value="rating">Rating</option>
                      </select>
                    </div>
                    {(form.trackingType === 'number' || form.trackingType === 'duration') && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target</label>
                          <input
                            type="number"
                            value={form.targetValue || ''}
                            onChange={(e) => update('targetValue', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit</label>
                          <input
                            type="text"
                            value={form.unit || ''}
                            onChange={(e) => update('unit', e.target.value)}
                            placeholder="e.g., pages"
                            className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setForm((prev) => ({ ...prev, newHabit: false }))}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    &larr; Back to existing habits
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="flex items-center justify-between p-4 border-t dark:border-slate-800">
            <div>
              {editingEntry && onDelete && (
                <button
                  onClick={() => onDelete(editingEntry)}
                  className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave()}
                className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
