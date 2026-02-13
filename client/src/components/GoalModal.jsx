import { useState } from 'react';
import { X, Check, Pipette } from 'lucide-react';

const PRESET_COLORS = [
  { hex: '#8b5cf6', label: 'Purple' },
  { hex: '#6366f1', label: 'Indigo' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#10b981', label: 'Green' },
  { hex: '#f59e0b', label: 'Yellow' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#64748b', label: 'Slate' },
];

export default function GoalModal({ goal, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: goal?.title || '',
    description: goal?.description || '',
    status: goal?.status || 'active',
    targetDate: goal?.targetDate ? goal.targetDate.slice(0, 10) : '',
    color: goal?.color || '#8b5cf6',
  });
  const [showCustomColor, setShowCustomColor] = useState(
    () => !PRESET_COLORS.some((c) => c.hex === (goal?.color || '#8b5cf6'))
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      targetDate: form.targetDate || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {goal?.id ? 'Edit Goal' : 'New Goal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <input
            required
            placeholder="Goal title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-white"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Target Date</span>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-white"
              />
            </label>
          </div>

          {/* Color Picker */}
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Color</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => { setForm({ ...form, color: c.hex }); setShowCustomColor(false); }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                    form.color === c.hex && !showCustomColor
                      ? 'border-gray-900 dark:border-white ring-2 ring-primary/30 scale-110'
                      : 'border-gray-200 dark:border-slate-600'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {form.color === c.hex && !showCustomColor && (
                    <Check size={14} className="text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
              {/* Custom color toggle */}
              <button
                type="button"
                title="Custom color"
                onClick={() => setShowCustomColor(true)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                  showCustomColor
                    ? 'border-gray-900 dark:border-white ring-2 ring-primary/30 scale-110'
                    : 'border-gray-200 dark:border-slate-600'
                } bg-gradient-to-br from-red-400 via-green-400 to-blue-400`}
              >
                <Pipette size={14} className="text-white drop-shadow-sm" />
              </button>
            </div>
            {showCustomColor && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-8 h-8 rounded border-0 cursor-pointer"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {form.color}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            {goal?.id && (
              <button
                type="button"
                onClick={() => onDelete(goal.id)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
