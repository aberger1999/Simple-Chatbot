import { useEffect, useRef } from 'react';
import { Trash2, CopyCheck } from 'lucide-react';

export default function EdgeContextMenu({ x, y, edgeId, onClose, onDelete, onApplyStyleToAll }) {
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

  return (
    <div
      ref={ref}
      className="fixed bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-xl py-1 z-[100] min-w-[180px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => { onApplyStyleToAll(edgeId); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
      >
        <CopyCheck size={14} /> Apply Style to All
      </button>
      <div className="border-t dark:border-slate-700 my-1" />
      <button
        onClick={() => { onDelete(edgeId); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
      >
        <Trash2 size={14} /> Delete Edge
      </button>
    </div>
  );
}
