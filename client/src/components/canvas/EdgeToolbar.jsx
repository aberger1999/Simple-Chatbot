import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Zap, ZapOff } from 'lucide-react';

const ARROW_STYLES = [
  { id: 'none', tip: 'No arrow' },
  { id: 'open', tip: 'Open arrow' },
  { id: 'filled', tip: 'Filled arrow' },
  { id: 'double', tip: 'Double arrow' },
];

function ArrowIcon({ type, active }) {
  const color = active ? '#6366f1' : 'currentColor';
  if (type === 'none') {
    return (
      <svg width="22" height="10" viewBox="0 0 22 10">
        <line x1="2" y1="5" x2="20" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'open') {
    return (
      <svg width="22" height="10" viewBox="0 0 22 10">
        <line x1="2" y1="5" x2="16" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <polyline points="14,1.5 20,5 14,8.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'filled') {
    return (
      <svg width="22" height="10" viewBox="0 0 22 10">
        <line x1="2" y1="5" x2="14" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <polygon points="14,1 21,5 14,9" fill={color} />
      </svg>
    );
  }
  // double
  return (
    <svg width="22" height="10" viewBox="0 0 22 10">
      <line x1="8" y1="5" x2="14" y2="5" stroke={color} strokeWidth="2" />
      <polygon points="1,5 8,1 8,9" fill={color} />
      <polygon points="21,5 14,1 14,9" fill={color} />
    </svg>
  );
}

export default function EdgeToolbar({ edge, position, onUpdate, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(position);
  const [labelDraft, setLabelDraft] = useState(edge.label || '');

  // Sync label draft when edge changes
  useEffect(() => { setLabelDraft(edge.label || ''); }, [edge.id, edge.label]);

  // Auto-reposition to stay on screen
  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    let x = position.x - rect.width / 2;
    let y = position.y - rect.height - 12;
    if (x + rect.width > window.innerWidth - 10) x = window.innerWidth - rect.width - 10;
    if (x < 10) x = 10;
    if (y < 10) y = position.y + 20;
    if (y + rect.height > window.innerHeight - 10) y = window.innerHeight - rect.height - 10;
    setPos({ x, y });
  }, [position]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const arrowStyle = edge.arrowStyle || 'none';
  const animated = !!edge.animated;

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl p-3 flex flex-col gap-3"
      style={{ left: pos.x, top: pos.y, minWidth: 220 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Animation toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Animate</span>
        <button
          onClick={() => onUpdate(edge.id, { animated: !animated })}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            animated
              ? 'bg-primary/10 text-primary dark:bg-primary/20'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
          }`}
        >
          {animated ? <Zap size={12} /> : <ZapOff size={12} />}
          {animated ? 'On' : 'Off'}
        </button>
      </div>

      {/* Label input */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Label</span>
        <input
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={() => onUpdate(edge.id, { label: labelDraft || undefined })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onUpdate(edge.id, { label: labelDraft || undefined });
          }}
          placeholder="Edge label..."
          className="w-full px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-600 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Arrowhead style */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1.5">Arrow</span>
        <div className="flex gap-1">
          {ARROW_STYLES.map((s) => (
            <button
              key={s.id}
              title={s.tip}
              onClick={() => onUpdate(edge.id, { arrowStyle: s.id })}
              className={`flex items-center justify-center p-1.5 rounded-lg border transition-colors ${
                arrowStyle === s.id
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary'
                  : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              <ArrowIcon type={s.id} active={arrowStyle === s.id} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
