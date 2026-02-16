import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Type, Square, StickyNote,
  Image, Layers, Target, BookMarked, Diamond, Circle, Columns,
  Upload, CheckSquare, Code, Table,
} from 'lucide-react';
import { goalsApi, notesApi, journalApi } from '../../api/client';

const NODE_PALETTE = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'box', label: 'Box', icon: Square },
  { type: 'diamond', label: 'Decision', icon: Diamond },
  { type: 'oval', label: 'Oval', icon: Circle },
  { type: 'parallelogram', label: 'I/O', icon: Columns },
  { type: 'stickyNote', label: 'Sticky Note', icon: StickyNote },
  { type: 'imageUpload', label: 'Image', icon: Upload },
  { type: 'checklist', label: 'Checklist', icon: CheckSquare },
  { type: 'codeBlock', label: 'Code', icon: Code },
  { type: 'table', label: 'Table', icon: Table },
  { type: 'image', label: 'Image URL', icon: Image },
  { type: 'section', label: 'Section', icon: Layers },
];

const HUB_TABS = ['Goals', 'Notes', 'Journal'];

function stripHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

export default function CanvasSidePanel({ onAddNode, onAddHubNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('Goals');

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.getGoals,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', 'recent'],
    queryFn: () => notesApi.getNotes(),
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journal', 'recent'],
    queryFn: () => journalApi.getRecent(15),
  });

  if (collapsed) {
    return (
      <div className="shrink-0 border-r dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
        >
          <ChevronRight size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 w-56 bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b dark:border-slate-800 shrink-0">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Toolbox</span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
        >
          <ChevronLeft size={14} className="text-gray-500" />
        </button>
      </div>

      {/* Node Palette */}
      <div className="px-3 py-2 border-b dark:border-slate-800 shrink-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Add Nodes</p>
        <div className="grid grid-cols-2 gap-1.5">
          {NODE_PALETTE.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => onAddNode(type)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
            >
              <Icon size={16} />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hub Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 pt-2 pb-1 shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Hub Content</p>
          <div className="flex gap-1">
            {HUB_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-[10px] py-1 rounded font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-2 py-1">
          {activeTab === 'Goals' && (
            <div className="space-y-1">
              {goals.filter((g) => g.status === 'active').map((g) => (
                <button
                  key={g.id}
                  onClick={() => onAddHubNode('goal', g)}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <Target size={12} className="text-primary shrink-0" />
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{g.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-1">
                      <div className="h-1 rounded-full" style={{ width: `${g.progress}%`, backgroundColor: g.color }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{g.progress}%</span>
                  </div>
                </button>
              ))}
              {goals.filter((g) => g.status === 'active').length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No active goals</p>
              )}
            </div>
          )}

          {activeTab === 'Notes' && (
            <div className="space-y-1">
              {notes.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => onAddHubNode('note', n)}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <StickyNote size={12} className="text-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{n.title}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5 ml-4">
                    {stripHtml(n.content)?.slice(0, 50)}
                  </p>
                </button>
              ))}
              {notes.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No notes yet</p>
              )}
            </div>
          )}

          {activeTab === 'Journal' && (
            <div className="space-y-1">
              {journalEntries
                .filter((j) => j.morningIntentions || j.content || j.eveningReflection)
                .map((j) => {
                  const excerpt = stripHtml(j.morningIntentions || j.content || j.eveningReflection)?.slice(0, 60);
                  return (
                    <button
                      key={j.id}
                      onClick={() => onAddHubNode('journal', j)}
                      className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <BookMarked size={12} className="text-emerald-500 shrink-0" />
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                          {new Date(j.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {excerpt && (
                        <p className="text-[10px] text-gray-400 truncate mt-0.5 ml-4">{excerpt}</p>
                      )}
                    </button>
                  );
                })}
              {journalEntries.filter((j) => j.morningIntentions || j.content || j.eveningReflection).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No journal entries</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
