import { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Target, StickyNote, BookMarked, Image } from 'lucide-react';

function EditableText({ value, onChange, className, placeholder, multiline }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { setText(value); }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    if (text !== value) onChange(text);
  }, [text, value, onChange]);

  if (editing) {
    const Tag = multiline ? 'textarea' : 'input';
    return (
      <Tag
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !multiline) commit();
          if (e.key === 'Escape') { setText(value); setEditing(false); }
        }}
        className={`${className} bg-transparent outline-none border border-primary/40 rounded px-1 w-full resize-none`}
        rows={multiline ? 3 : undefined}
      />
    );
  }

  return (
    <div
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={`${className} cursor-text`}
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
    </div>
  );
}

const handleStyle = { width: 8, height: 8 };

export function TextNode({ data, id }) {
  return (
    <div
      className="px-4 py-2 rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-600 shadow-sm min-w-[120px]"
      style={{ borderColor: data.color || undefined }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <EditableText
        value={data.label}
        onChange={(v) => data.onLabelChange?.(id, v)}
        className="text-sm text-gray-800 dark:text-gray-200"
        placeholder="Text..."
      />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function BoxNode({ data, id }) {
  return (
    <div
      className="px-5 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 shadow-md min-w-[150px]"
      style={{ borderColor: data.color || '#6366f1' }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <EditableText
        value={data.label}
        onChange={(v) => data.onLabelChange?.(id, v)}
        className="text-sm font-semibold text-gray-900 dark:text-white text-center"
        placeholder="Box title..."
      />
      {data.description !== undefined && (
        <EditableText
          value={data.description}
          onChange={(v) => data.onDescriptionChange?.(id, v)}
          className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center"
          placeholder="Description..."
          multiline
        />
      )}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function StickyNoteNode({ data, id }) {
  const bgColors = {
    yellow: 'bg-amber-100 dark:bg-amber-200',
    green: 'bg-green-100 dark:bg-green-200',
    blue: 'bg-blue-100 dark:bg-blue-200',
    pink: 'bg-pink-100 dark:bg-pink-200',
    purple: 'bg-purple-100 dark:bg-purple-200',
  };
  const bg = bgColors[data.stickyColor || 'yellow'] || bgColors.yellow;

  return (
    <div className={`${bg} p-4 rounded shadow-md min-w-[140px] min-h-[100px]`}>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <EditableText
        value={data.label}
        onChange={(v) => data.onLabelChange?.(id, v)}
        className="text-sm text-gray-800 font-medium"
        placeholder="Sticky note..."
        multiline
      />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function ImageNode({ data, id }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-600 shadow-sm overflow-hidden min-w-[160px]">
      <Handle type="target" position={Position.Top} style={handleStyle} />
      {data.imageUrl ? (
        <img
          src={data.imageUrl}
          alt={data.label || 'Image'}
          className="w-full max-h-48 object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div className="flex items-center justify-center h-24 bg-gray-100 dark:bg-slate-700">
          <Image size={24} className="text-gray-400" />
        </div>
      )}
      <div className="px-3 py-2">
        <EditableText
          value={data.label}
          onChange={(v) => data.onLabelChange?.(id, v)}
          className="text-xs text-gray-600 dark:text-gray-300"
          placeholder="Image URL or caption..."
        />
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function SectionNode({ data, id }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed min-w-[250px] min-h-[180px] p-3"
      style={{ borderColor: data.color || '#94a3b8', backgroundColor: (data.color || '#94a3b8') + '08' }}
    >
      <EditableText
        value={data.label}
        onChange={(v) => data.onLabelChange?.(id, v)}
        className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2"
        placeholder="Section name..."
      />
    </div>
  );
}

function stripHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

export function GoalNode({ data, id }) {
  const statusColors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  };

  return (
    <div
      className="rounded-xl border-l-4 bg-white dark:bg-slate-800 shadow-md px-4 py-3 min-w-[180px] max-w-[240px] border border-gray-200 dark:border-slate-700"
      style={{ borderLeftColor: data.goalColor || '#6366f1' }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div className="flex items-center gap-1.5 mb-1">
        <Target size={12} className="text-primary shrink-0" />
        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[data.goalStatus] || statusColors.active}`}>
          {data.goalStatus || 'active'}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${data.goalProgress || 0}%`, backgroundColor: data.goalColor || '#6366f1' }}
        />
      </div>
      <span className="text-[10px] text-gray-400 mt-0.5 block">{data.goalProgress || 0}%</span>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function NoteNode({ data, id }) {
  const preview = stripHtml(data.noteContent)?.slice(0, 80);
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 shadow-md px-4 py-3 min-w-[180px] max-w-[240px] border border-amber-200 dark:border-amber-500/30">
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div className="flex items-center gap-1.5 mb-1">
        <StickyNote size={12} className="text-amber-500 shrink-0" />
        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
      {preview && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{preview}</p>
      )}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function JournalNode({ data, id }) {
  const excerpt = stripHtml(data.journalExcerpt)?.slice(0, 80);
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 shadow-md px-4 py-3 min-w-[180px] max-w-[240px] border border-emerald-200 dark:border-emerald-500/30">
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div className="flex items-center gap-1.5 mb-1">
        <BookMarked size={12} className="text-emerald-500 shrink-0" />
        <span className="text-xs font-bold text-gray-900 dark:text-white">{data.label}</span>
      </div>
      {excerpt && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{excerpt}</p>
      )}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export const nodeTypes = {
  text: TextNode,
  box: BoxNode,
  stickyNote: StickyNoteNode,
  image: ImageNode,
  section: SectionNode,
  goal: GoalNode,
  note: NoteNode,
  journal: JournalNode,
};
