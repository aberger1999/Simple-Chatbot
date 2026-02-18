import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, Plus, Trash2, Check, X,
  ChevronDown, ChevronRight, StickyNote, Calendar, BookOpen, ExternalLink,
} from 'lucide-react';
import { goalsApi, milestonesApi } from '../api/client';
import GoalModal from '../components/GoalModal';

function getDaysRemaining(targetDate) {
  const target = new Date(targetDate);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function DaysCountdown({ targetDate }) {
  if (!targetDate) return null;
  const days = getDaysRemaining(targetDate);
  if (days < 0) {
    return <span className="text-xs font-medium text-red-500">{Math.abs(days)}d overdue</span>;
  }
  if (days === 0) {
    return <span className="text-xs font-medium text-amber-500">Due today</span>;
  }
  return (
    <span className={`text-xs font-medium ${days <= 7 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
      {days}d left
    </span>
  );
}

function MilestoneItem({ milestone, goalId }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(milestone.title);
  const [subInput, setSubInput] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['goal', goalId] });

  const toggleMut = useMutation({
    mutationFn: () => milestonesApi.updateMilestone(milestone.id, { isCompleted: !milestone.isCompleted }),
    onSuccess: invalidate,
  });

  const updateMut = useMutation({
    mutationFn: (title) => milestonesApi.updateMilestone(milestone.id, { title }),
    onSuccess: () => { setEditing(false); invalidate(); },
  });

  const deleteMut = useMutation({
    mutationFn: () => milestonesApi.deleteMilestone(milestone.id),
    onSuccess: invalidate,
  });

  const addSubMut = useMutation({
    mutationFn: (title) => milestonesApi.createSubMilestone(milestone.id, { title }),
    onSuccess: () => { setSubInput(''); invalidate(); },
  });

  const toggleSubMut = useMutation({
    mutationFn: ({ id, isCompleted }) => milestonesApi.updateSubMilestone(id, { isCompleted }),
    onSuccess: invalidate,
  });

  const updateSubMut = useMutation({
    mutationFn: ({ id, title }) => milestonesApi.updateSubMilestone(id, { title }),
    onSuccess: invalidate,
  });

  const deleteSubMut = useMutation({
    mutationFn: (id) => milestonesApi.deleteSubMilestone(id),
    onSuccess: invalidate,
  });

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') updateMut.mutate(editTitle);
    if (e.key === 'Escape') { setEditing(false); setEditTitle(milestone.title); }
  };

  const handleSubKeyDown = (e) => {
    if (e.key === 'Enter' && subInput.trim()) addSubMut.mutate(subInput.trim());
    if (e.key === 'Escape') setSubInput('');
  };

  return (
    <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800/50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <button
          onClick={() => toggleMut.mutate()}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            milestone.isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-slate-600 hover:border-green-400'
          }`}
        >
          {milestone.isCompleted && <Check size={12} />}
        </button>

        {editing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={() => { setEditing(false); setEditTitle(milestone.title); }}
            className="flex-1 text-sm bg-white dark:bg-slate-800 border dark:border-slate-600 rounded px-2 py-1 dark:text-white"
          />
        ) : (
          <span
            onClick={() => { setEditing(true); setEditTitle(milestone.title); }}
            className={`flex-1 text-sm cursor-pointer ${
              milestone.isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
            }`}
          >
            {milestone.title}
          </span>
        )}

        <button
          onClick={() => { setEditing(true); setEditTitle(milestone.title); }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => deleteMut.mutate()}
          className="text-gray-400 hover:text-red-500 shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="pl-12 pr-3 py-2 space-y-1">
          {milestone.subMilestones.map((sub) => (
            <SubMilestoneItem
              key={sub.id}
              sub={sub}
              onToggle={() => toggleSubMut.mutate({ id: sub.id, isCompleted: !sub.isCompleted })}
              onUpdate={(title) => updateSubMut.mutate({ id: sub.id, title })}
              onDelete={() => deleteSubMut.mutate(sub.id)}
            />
          ))}
          <div className="flex items-center gap-2 pt-1">
            <Plus size={14} className="text-gray-400 shrink-0" />
            <input
              value={subInput}
              onChange={(e) => setSubInput(e.target.value)}
              onKeyDown={handleSubKeyDown}
              placeholder="Add sub-item..."
              className="flex-1 text-xs bg-transparent border-b dark:border-slate-700 border-gray-200 py-1 text-gray-600 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SubMilestoneItem({ sub, onToggle, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(sub.title);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { onUpdate(editTitle); setEditing(false); }
    if (e.key === 'Escape') { setEditing(false); setEditTitle(sub.title); }
  };

  return (
    <div className="flex items-center gap-2 group">
      <button
        onClick={onToggle}
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          sub.isCompleted
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 dark:border-slate-600 hover:border-green-400'
        }`}
      >
        {sub.isCompleted && <Check size={10} />}
      </button>

      {editing ? (
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { setEditing(false); setEditTitle(sub.title); }}
          className="flex-1 text-xs bg-white dark:bg-slate-800 border dark:border-slate-600 rounded px-2 py-0.5 dark:text-white"
        />
      ) : (
        <span
          onClick={() => { setEditing(true); setEditTitle(sub.title); }}
          className={`flex-1 text-xs cursor-pointer ${
            sub.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {sub.title}
        </span>
      )}

      <button
        onClick={() => { setEditing(true); setEditTitle(sub.title); }}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 shrink-0"
      >
        <Pencil size={12} />
      </button>
      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export default function GoalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [milestoneInput, setMilestoneInput] = useState('');

  const { data: goal, isLoading } = useQuery({
    queryKey: ['goal', id],
    queryFn: () => goalsApi.getGoal(id),
  });

  const updateMut = useMutation({
    mutationFn: (data) => goalsApi.updateGoal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal', id] });
      qc.invalidateQueries({ queryKey: ['goals'] });
      setModal(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => goalsApi.deleteGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      navigate('/goals');
    },
  });

  const addMilestoneMut = useMutation({
    mutationFn: (title) => milestonesApi.createMilestone(id, { title }),
    onSuccess: () => {
      setMilestoneInput('');
      qc.invalidateQueries({ queryKey: ['goal', id] });
    },
  });

  const handleMilestoneKeyDown = (e) => {
    if (e.key === 'Enter' && milestoneInput.trim()) {
      addMilestoneMut.mutate(milestoneInput.trim());
    }
  };

  const handleProgressModeToggle = (mode) => {
    updateMut.mutate({ progressMode: mode });
  };

  const handleManualProgress = (progress) => {
    updateMut.mutate({ progress: parseInt(progress) });
  };

  const handleStatusChange = (status) => {
    updateMut.mutate({ status });
  };

  const handleTargetDateChange = (targetDate) => {
    updateMut.mutate({ targetDate: targetDate || null });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Goal not found.</p>
        <button onClick={() => navigate('/goals')} className="text-primary hover:underline mt-2">
          Back to Goals
        </button>
      </div>
    );
  }

  const milestones = goal.milestones || [];
  const completedMilestones = milestones.filter((m) => m.isCompleted).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/goals')}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary"
        >
          <ArrowLeft size={16} /> Back to Goals
        </button>
        <button
          onClick={() => setModal(goal)}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark"
        >
          <Pencil size={14} /> Edit
        </button>
      </div>

      {/* Color bar */}
      <div className="h-2 rounded-full mb-6" style={{ backgroundColor: goal.color }} />

      {/* Title + Status */}
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{goal.title}</h1>
        <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ml-3 ${
          goal.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          goal.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {goal.status}
        </span>
      </div>

      {goal.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{goal.description}</p>
      )}

      {/* Progress Section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
          Progress
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800/80 p-4 space-y-4">
          {/* Status + Target Date + Mode row */}
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
              <select
                value={goal.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full border dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm dark:bg-slate-800 dark:text-white"
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
                value={goal.targetDate ? goal.targetDate.slice(0, 10) : ''}
                onChange={(e) => handleTargetDateChange(e.target.value)}
                className="w-full border dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm dark:bg-slate-800 dark:text-white"
              />
            </label>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Mode</span>
              <div className="flex rounded-lg border dark:border-slate-600 overflow-hidden mt-0.5">
                <button
                  onClick={() => handleProgressModeToggle('manual')}
                  className={`flex-1 text-xs px-2 py-1.5 transition-colors ${
                    goal.progressMode === 'manual'
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => handleProgressModeToggle('milestones')}
                  className={`flex-1 text-xs px-2 py-1.5 transition-colors ${
                    goal.progressMode === 'milestones'
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Milestones
                </button>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${goal.progress}%`, backgroundColor: goal.color }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                {goal.progress}%
              </span>
            </div>

            {goal.progressMode === 'manual' ? (
              <input
                type="range"
                min="0"
                max="100"
                value={goal.progress}
                onChange={(e) => handleManualProgress(e.target.value)}
                className="w-full"
              />
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {milestones.length > 0
                  ? `${completedMilestones} of ${milestones.length} milestones complete`
                  : 'Add milestones to track progress'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Milestones Section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
          Milestones
        </h2>
        <div className="space-y-2">
          {milestones.map((m) => (
            <MilestoneItem key={m.id} milestone={m} goalId={id} />
          ))}
        </div>

        {/* Add milestone input */}
        <div className="flex items-center gap-2 mt-3">
          <Plus size={16} className="text-gray-400 shrink-0" />
          <input
            value={milestoneInput}
            onChange={(e) => setMilestoneInput(e.target.value)}
            onKeyDown={handleMilestoneKeyDown}
            placeholder="Add milestone..."
            className="flex-1 text-sm bg-transparent border-b dark:border-slate-700 border-gray-200 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:border-primary"
          />
          {milestoneInput.trim() && (
            <button
              onClick={() => { addMilestoneMut.mutate(milestoneInput.trim()); }}
              className="text-xs btn-gradient text-white px-3 py-1 rounded-lg"
            >
              Add
            </button>
          )}
        </div>
      </section>

      {/* Linked Items Section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
          Linked Items
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800/80 p-4 space-y-4">
          {/* Notes */}
          {goal.notes?.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                <StickyNote size={14} /> Linked Notes ({goal.notes.length})
              </h3>
              <ul className="space-y-1">
                {goal.notes.map((n) => (
                  <li key={n.id} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 rounded px-3 py-2">
                    <span>{n.title}</span>
                    <button
                      onClick={() => navigate(`/notes/${n.id}`)}
                      className="text-primary hover:text-primary-dark shrink-0 ml-2"
                      title="Open note"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Events */}
          {goal.events?.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                <Calendar size={14} /> Linked Events ({goal.events.length})
              </h3>
              <ul className="space-y-1">
                {goal.events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 rounded px-3 py-2">
                    <span>{e.title} - {new Date(e.start).toLocaleDateString()}</span>
                    <button
                      onClick={() => navigate(`/calendar?date=${e.start.slice(0, 10)}`)}
                      className="text-primary hover:text-primary-dark shrink-0 ml-2"
                      title="View in calendar"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Thought Posts */}
          {goal.thoughtPosts?.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                <BookOpen size={14} /> Linked Thoughts ({goal.thoughtPosts.length})
              </h3>
              <ul className="space-y-1">
                {goal.thoughtPosts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 rounded px-3 py-2">
                    <span>{p.title}</span>
                    <button
                      onClick={() => navigate('/thoughts')}
                      className="text-primary hover:text-primary-dark shrink-0 ml-2"
                      title="Open thought board"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!goal.notes?.length && !goal.events?.length && !goal.thoughtPosts?.length && (
            <p className="text-sm text-gray-400">No linked items yet.</p>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
          Info
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800/80 p-4 text-sm text-gray-500 dark:text-gray-400 space-y-1">
          {goal.targetDate && (
            <p className="flex items-center gap-2">
              <span>
                Target: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <DaysCountdown targetDate={goal.targetDate} />
            </p>
          )}
          <p>
            Created: {new Date(goal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}
            Updated: {new Date(goal.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </section>

      {/* GoalModal for editing */}
      {modal && (
        <GoalModal
          goal={modal}
          onClose={() => setModal(null)}
          onSave={(data) => updateMut.mutate(data)}
          onDelete={() => deleteMut.mutate()}
        />
      )}
    </div>
  );
}
