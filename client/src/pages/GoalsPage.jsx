import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, Circle } from 'lucide-react';
import { goalsApi } from '../api/client';
import GoalModal from '../components/GoalModal';

function getDaysRemaining(targetDate) {
  const target = new Date(targetDate);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export default function GoalsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);

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
                  onClick={() => navigate(`/goals/${goal.id}`)}
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
              {goal.targetDate && (() => {
                const days = getDaysRemaining(goal.targetDate);
                return (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                    <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                    <span className={`font-medium ${
                      days < 0 ? 'text-red-500' : days === 0 ? 'text-amber-500' : days <= 7 ? 'text-amber-500' : 'text-gray-400'
                    }`}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                    </span>
                  </p>
                );
              })()}
              {/* Remaining milestones */}
              {goal.milestones?.filter((m) => !m.isCompleted).length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {goal.milestones.filter((m) => !m.isCompleted).slice(0, 3).map((m) => (
                    <div key={m.id} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Circle size={8} className="shrink-0" />
                      <span className="truncate">{m.title}</span>
                    </div>
                  ))}
                  {goal.milestones.filter((m) => !m.isCompleted).length > 3 && (
                    <p className="text-xs text-gray-400 pl-4">
                      +{goal.milestones.filter((m) => !m.isCompleted).length - 3} more
                    </p>
                  )}
                </div>
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
    </div>
  );
}
