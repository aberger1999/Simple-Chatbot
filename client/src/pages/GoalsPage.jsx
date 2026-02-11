import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Target, X, Calendar, StickyNote, BookOpen } from 'lucide-react';
import { goalsApi } from '../api/client';

function GoalModal({ goal, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: goal?.title || '',
    description: goal?.description || '',
    status: goal?.status || 'active',
    targetDate: goal?.targetDate ? goal.targetDate.slice(0, 10) : '',
    progress: goal?.progress || 0,
    color: goal?.color || '#8b5cf6',
  });

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
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Progress: {form.progress}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            Color
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-8 h-8 rounded border-0 cursor-pointer"
            />
          </label>
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

function GoalDetail({ goalId, onClose }) {
  const { data: goal } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalsApi.getGoal(goalId),
  });

  if (!goal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: goal.color }} />
            <h2 className="font-semibold text-gray-900 dark:text-white">{goal.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {goal.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{goal.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm">
            <span className={`px-2 py-1 rounded-full text-xs ${
              goal.status === 'active' ? 'bg-green-100 text-green-700' :
              goal.status === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {goal.status}
            </span>
            <span className="text-gray-500">{goal.progress}% complete</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{ width: `${goal.progress}%`, backgroundColor: goal.color }}
            />
          </div>

          {/* Linked Notes */}
          {goal.notes?.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                <StickyNote size={14} /> Linked Notes ({goal.notes.length})
              </h3>
              <ul className="space-y-1">
                {goal.notes.map((n) => (
                  <li key={n.id} className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 rounded px-3 py-2">
                    {n.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Linked Events */}
          {goal.events?.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                <Calendar size={14} /> Linked Events ({goal.events.length})
              </h3>
              <ul className="space-y-1">
                {goal.events.map((e) => (
                  <li key={e.id} className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 rounded px-3 py-2">
                    {e.title} - {new Date(e.start).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Linked Blog Posts */}
          {goal.blogPosts?.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                <BookOpen size={14} /> Linked Posts ({goal.blogPosts.length})
              </h3>
              <ul className="space-y-1">
                {goal.blogPosts.map((p) => (
                  <li key={p.id} className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 rounded px-3 py-2">
                    {p.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.getGoals(),
  });

  const createMut = useMutation({
    mutationFn: goalsApi.createGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setModal(null); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => goalsApi.updateGoal(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setModal(null); },
  });

  const deleteMut = useMutation({
    mutationFn: goalsApi.deleteGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setModal(null); },
  });

  const handleSave = (data) => {
    if (modal?.id) {
      updateMut.mutate({ id: modal.id, ...data });
    } else {
      createMut.mutate(data);
    }
  };

  const statusOrder = { active: 0, paused: 1, completed: 2 };
  const sorted = [...goals].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals / Vision Board</h1>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-white text-sm px-3 py-2 rounded-lg"
        >
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Goal cards - Pinterest-like grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
        {sorted.map((goal) => (
          <div
            key={goal.id}
            className="break-inside-avoid bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 overflow-hidden"
          >
            <div className="h-2" style={{ backgroundColor: goal.color }} />
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <button
                  onClick={() => setDetailId(goal.id)}
                  className="font-semibold text-gray-900 dark:text-white text-left hover:text-primary"
                >
                  {goal.title}
                </button>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                  goal.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  goal.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {goal.status}
                </span>
              </div>
              {goal.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-3">
                  {goal.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Progress</span>
                <span>{goal.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${goal.progress}%`, backgroundColor: goal.color }}
                />
              </div>
              {goal.targetDate && (
                <p className="text-xs text-gray-400 mt-2">
                  Target: {new Date(goal.targetDate).toLocaleDateString()}
                </p>
              )}
              <button
                onClick={() => setModal(goal)}
                className="text-xs text-primary hover:underline mt-2 block"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Target size={40} className="mx-auto mb-3 opacity-50" />
          <p>No goals yet. Set your first one!</p>
        </div>
      )}

      {modal && (
        <GoalModal
          goal={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      )}

      {detailId && (
        <GoalDetail goalId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}
