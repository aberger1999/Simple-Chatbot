import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Check, ChevronDown } from 'lucide-react';
import { goalsApi, habitsApi } from '../api/client';

const PRESET_CATEGORIES = [
  { id: 'sleep', label: 'Sleep' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'diet_health', label: 'Diet & Health' },
];

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  }
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function MultiSelectDropdown({ label, options, selected, onChange, searchable }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = searchable && search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-primary"
      >
        <span className="truncate">
          {selected.length === 0 ? label : `${selected.length} selected`}
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((id) => {
            const opt = options.find((o) => o.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
              >
                {opt?.label || id}
                <button type="button" onClick={() => toggle(id)} className="hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-auto">
          {searchable && (
            <div className="p-2 border-b dark:border-slate-700">
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-slate-700 rounded">
                <Search size={14} className="text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="bg-transparent outline-none text-sm flex-1 text-gray-700 dark:text-gray-200"
                />
              </div>
            </div>
          )}
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-gray-400 text-center">No options found</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 text-left text-gray-700 dark:text-gray-300"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  selected.includes(opt.id)
                    ? 'bg-primary border-primary text-white'
                    : 'border-gray-300 dark:border-slate-500'
                }`}>
                  {selected.includes(opt.id) && <Check size={12} />}
                </div>
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function FocusSessionModal({
  open,
  onClose,
  onSave,
  plannedDuration,
  actualDuration,
  status,
  editingSession,
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [goalIds, setGoalIds] = useState([]);
  const [habitIds, setHabitIds] = useState([]);
  const [habitCategories, setHabitCategories] = useState([]);

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.getGoals,
    enabled: open,
  });

  const { data: customHabits = [] } = useQuery({
    queryKey: ['customHabits'],
    queryFn: habitsApi.getCustomHabits,
    enabled: open,
  });

  useEffect(() => {
    if (editingSession) {
      setTitle(editingSession.title || '');
      setNotes(editingSession.notes || '');
      setGoalIds(editingSession.goalIds || []);
      setHabitIds(editingSession.habitIds || []);
      setHabitCategories(editingSession.habitCategories || []);
    } else {
      setTitle('');
      setNotes('');
      setGoalIds([]);
      setHabitIds([]);
      setHabitCategories([]);
    }
  }, [editingSession, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const planned = plannedDuration ?? editingSession?.plannedDuration ?? 0;
  const actual = actualDuration ?? editingSession?.actualDuration ?? 0;
  const sessionStatus = status ?? editingSession?.status ?? 'completed';

  const activeGoalOptions = goals
    .filter((g) => g.status === 'active')
    .map((g) => ({ id: g.id, label: g.title }));

  const habitOptions = [
    ...PRESET_CATEGORIES,
    ...customHabits.map((h) => ({ id: h.id, label: h.name })),
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      title,
      notes,
      plannedDuration: planned,
      actualDuration: actual,
      status: sessionStatus,
      goalIds,
      habitIds: habitIds.filter((id) => typeof id === 'number'),
      habitCategories: [
        ...habitCategories,
        ...habitIds.filter((id) => typeof id === 'string'),
      ],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-modal z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800/80 w-full max-w-lg max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b dark:border-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingSession ? 'Edit Focus Session' : 'Log Focus Session'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Duration badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              sessionStatus === 'completed'
                ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
            }`}>
              {sessionStatus === 'completed' ? 'Completed' : 'Stopped early'}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatDuration(actual)} / {formatDuration(planned)}
            </span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              What were you working on?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Deep work on project..."
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none"
              autoFocus
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any thoughts or reflections..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            />
          </div>

          {/* Link to goals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Link to Goals
            </label>
            <MultiSelectDropdown
              label="Select goals..."
              options={activeGoalOptions}
              selected={goalIds}
              onChange={setGoalIds}
              searchable
            />
          </div>

          {/* Link to habits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Link to Habits
            </label>
            <MultiSelectDropdown
              label="Select habits..."
              options={habitOptions}
              selected={[...habitCategories, ...habitIds]}
              onChange={(selected) => {
                const cats = selected.filter((id) => typeof id === 'string');
                const ids = selected.filter((id) => typeof id === 'number');
                setHabitCategories(cats);
                setHabitIds(ids);
              }}
              searchable
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 btn-gradient text-white text-sm rounded-lg"
            >
              {editingSession ? 'Update' : 'Save Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
