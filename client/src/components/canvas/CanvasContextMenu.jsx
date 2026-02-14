import { useEffect, useRef } from 'react';
import { Trash2, Copy, Palette, ExternalLink, Plus } from 'lucide-react';

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6', '#64748b'];

export default function CanvasContextMenu({
  x,
  y,
  nodeId,
  nodeData,
  onClose,
  onDelete,
  onDuplicate,
  onColorChange,
  onNavigate,
  onAddChild,
  showAddChild,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const hubType = nodeData?.hubType;
  const hubId = nodeData?.hubId;

  return (
    <div
      ref={ref}
      className="fixed bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-xl py-1 z-[100] min-w-[180px]"
      style={{ left: x, top: y }}
    >
      {showAddChild && (
        <button
          onClick={() => { onAddChild(nodeId); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <Plus size={14} /> Add Child Node
        </button>
      )}
      <button
        onClick={() => { onDuplicate(nodeId); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
      >
        <Copy size={14} /> Duplicate
      </button>

      <div className="px-3 py-2">
        <div className="flex items-center gap-1 mb-1">
          <Palette size={12} className="text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Color</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { onColorChange(nodeId, c); onClose(); }}
              className="w-5 h-5 rounded-full border-2 border-transparent hover:border-gray-400 transition-colors"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {hubType && hubId && (
        <>
          <div className="border-t dark:border-slate-700 my-1" />
          <button
            onClick={() => { onNavigate(hubType, hubId); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <ExternalLink size={14} /> Open in App
          </button>
        </>
      )}

      <div className="border-t dark:border-slate-700 my-1" />
      <button
        onClick={() => { onDelete(nodeId); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
      >
        <Trash2 size={14} /> Delete
      </button>
    </div>
  );
}
