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

export function DiamondNode({ data, id }) {
  const size = 90;
  const color = data.color || '#6366f1';

  return (
    <div className="relative" style={{ width: size + 30, height: size + 30 }}>
      <Handle type="target" position={Position.Top} style={{ ...handleStyle, left: '50%' }} />
      {/* Rotated square background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="bg-white dark:bg-slate-800 shadow-md"
          style={{
            width: size,
            height: size,
            border: `2px solid ${color}`,
            transform: 'rotate(45deg)',
          }}
        />
      </div>
      {/* Text overlay (not rotated) */}
      <div className="absolute inset-0 flex items-center justify-center px-5">
        <EditableText
          value={data.label}
          onChange={(v) => data.onLabelChange?.(id, v)}
          className="text-xs font-semibold text-gray-900 dark:text-white text-center leading-tight"
          placeholder="Condition?"
        />
      </div>
      {/* Yes handle — bottom-left */}
      <Handle
        type="source"
        id="yes"
        position={Position.Bottom}
        style={{ ...handleStyle, left: '30%', bottom: -4 }}
      />
      <span
        className="absolute text-[9px] font-bold text-green-600 dark:text-green-400 select-none pointer-events-none"
        style={{ bottom: -16, left: '18%' }}
      >
        Yes
      </span>
      {/* No handle — bottom-right */}
      <Handle
        type="source"
        id="no"
        position={Position.Bottom}
        style={{ ...handleStyle, left: '70%', bottom: -4 }}
      />
      <span
        className="absolute text-[9px] font-bold text-red-500 dark:text-red-400 select-none pointer-events-none"
        style={{ bottom: -16, left: '64%' }}
      >
        No
      </span>
    </div>
  );
}

export function OvalNode({ data, id }) {
  const color = data.color || '#6366f1';

  return (
    <div
      className="relative px-7 py-3 shadow-md min-w-[130px] flex items-center justify-center"
      style={{
        borderRadius: '50% / 45%',
        border: `2.5px solid ${color}`,
        background: `linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 100%)`,
      }}
    >
      <div className="absolute inset-0 rounded-[50%/45%] bg-white dark:bg-slate-800 -z-10" />
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <EditableText
        value={data.label}
        onChange={(v) => data.onLabelChange?.(id, v)}
        className="text-sm font-semibold text-gray-900 dark:text-white text-center"
        placeholder="Start / End"
      />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function ParallelogramNode({ data, id }) {
  const color = data.color || '#6366f1';

  return (
    <div className="relative min-w-[150px]">
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div
        className="px-8 py-3 bg-white dark:bg-slate-800 shadow-md border-2"
        style={{
          borderColor: color,
          transform: 'skewX(-12deg)',
          borderRadius: 4,
        }}
      >
        <div style={{ transform: 'skewX(12deg)' }}>
          <EditableText
            value={data.label}
            onChange={(v) => data.onLabelChange?.(id, v)}
            className="text-sm text-gray-900 dark:text-white text-center"
            placeholder="Input / Output"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function ImageUploadNode({ data, id }) {
  const fileRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      data.onDataChange?.(id, { imageBase64: e.target.result });
    };
    reader.readAsDataURL(file);
  }

  function onDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  }

  return (
    <div
      className="rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-600 shadow-sm overflow-hidden"
      style={{ borderColor: data.color || undefined, width: 240 }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      {data.imageBase64 ? (
        <div className="relative group">
          <img src={data.imageBase64} alt={data.label || 'Uploaded'} className="w-full object-contain max-h-64" />
          <button
            onClick={() => { data.onDataChange?.(id, { imageBase64: '' }); }}
            className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            &times;
          </button>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 m-2 rounded-lg cursor-pointer hover:border-primary transition-colors"
        >
          <Image size={24} className="text-gray-400 mb-2" />
          <span className="text-[11px] text-gray-400 text-center px-2">Drop image or click to upload</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}
      <div className="px-3 py-1.5">
        <EditableText
          value={data.label}
          onChange={(v) => data.onLabelChange?.(id, v)}
          className="text-[11px] text-gray-500 dark:text-gray-400"
          placeholder="Caption..."
        />
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function ChecklistNode({ data, id }) {
  const items = data.checklistItems || [];

  function updateItems(newItems) {
    data.onDataChange?.(id, { checklistItems: newItems });
  }

  function toggleItem(idx) {
    const next = items.map((item, i) =>
      i === idx ? { ...item, checked: !item.checked } : item
    );
    updateItems(next);
  }

  function changeItemText(idx, text) {
    const next = items.map((item, i) =>
      i === idx ? { ...item, text } : item
    );
    updateItems(next);
  }

  function addItem() {
    updateItems([...items, { id: String(Date.now()), text: '', checked: false }]);
  }

  function removeItem(idx) {
    updateItems(items.filter((_, i) => i !== idx));
  }

  return (
    <div
      className="rounded-xl border bg-white dark:bg-slate-800 shadow-md min-w-[200px] max-w-[280px]"
      style={{ borderColor: data.color || '#6366f1' }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div className="px-3 pt-3 pb-1">
        <EditableText
          value={data.label}
          onChange={(v) => data.onLabelChange?.(id, v)}
          className="text-xs font-bold text-gray-900 dark:text-white"
          placeholder="Checklist title..."
        />
      </div>
      <div className="px-3 pb-2 space-y-1">
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-start gap-1.5 group">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(idx)}
              className="mt-0.5 shrink-0 accent-primary"
            />
            <ChecklistItemText
              value={item.text}
              checked={item.checked}
              onChange={(v) => changeItemText(idx, v)}
            />
            <button
              onClick={() => removeItem(idx)}
              className="text-gray-300 hover:text-red-400 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
            >
              &times;
            </button>
          </div>
        ))}
        <button
          onClick={addItem}
          className="text-[10px] text-primary hover:text-primary-dark font-medium mt-1"
        >
          + Add item
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

function ChecklistItemText({ value, checked, onChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); }
  }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    if (text !== value) onChange(text);
  }, [text, value, onChange]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setText(value); setEditing(false); }
        }}
        className="text-xs bg-transparent outline-none border-b border-primary/40 w-full text-gray-800 dark:text-gray-200"
      />
    );
  }

  return (
    <div
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={`text-xs cursor-text flex-1 min-w-0 ${checked ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}
    >
      {value || <span className="text-gray-400 italic">Item...</span>}
    </div>
  );
}

const CODE_LANGUAGES = ['JavaScript', 'Python', 'TypeScript', 'HTML', 'CSS', 'SQL', 'Plain Text'];

export function CodeBlockNode({ data, id }) {
  const [content, setContent] = useState(data.codeContent || '');

  useEffect(() => { setContent(data.codeContent || ''); }, [data.codeContent]);

  function commitContent() {
    if (content !== (data.codeContent || '')) {
      data.onDataChange?.(id, { codeContent: content });
    }
  }

  return (
    <div
      className="rounded-lg border shadow-md overflow-hidden min-w-[260px] max-w-[420px]"
      style={{ borderColor: data.color || '#334155' }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 dark:bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 opacity-60" />
          <div className="w-2 h-2 rounded-full bg-yellow-500 opacity-60" />
          <div className="w-2 h-2 rounded-full bg-green-500 opacity-60" />
        </div>
        <select
          value={data.codeLanguage || 'javascript'}
          onChange={(e) => data.onDataChange?.(id, { codeLanguage: e.target.value })}
          className="text-[10px] bg-slate-700 text-slate-300 border-none rounded px-1.5 py-0.5 outline-none cursor-pointer"
        >
          {CODE_LANGUAGES.map((lang) => (
            <option key={lang} value={lang.toLowerCase().replace(' ', '')}>{lang}</option>
          ))}
        </select>
      </div>
      {/* Code area */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={commitContent}
        spellCheck={false}
        rows={6}
        className="w-full bg-slate-900 text-green-400 text-xs px-3 py-2 outline-none resize-y leading-relaxed"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', minHeight: 80 }}
        placeholder="// Write code here..."
      />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function TableNode({ data, id }) {
  const tableData = data.tableData || [['', '', ''], ['', '', ''], ['', '', '']];
  const [editCell, setEditCell] = useState(null);

  function updateCell(row, col, value) {
    const next = tableData.map((r, ri) =>
      ri === row ? r.map((c, ci) => (ci === col ? value : c)) : [...r]
    );
    data.onDataChange?.(id, { tableData: next });
  }

  function addRow() {
    const cols = tableData[0]?.length || 3;
    data.onDataChange?.(id, { tableData: [...tableData, Array(cols).fill('')] });
  }

  function addColumn() {
    data.onDataChange?.(id, { tableData: tableData.map((r) => [...r, '']) });
  }

  return (
    <div
      className="rounded-lg border bg-white dark:bg-slate-800 shadow-md overflow-hidden"
      style={{ borderColor: data.color || '#6366f1' }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      {/* Optional title */}
      <div className="px-3 pt-2 pb-1">
        <EditableText
          value={data.label}
          onChange={(v) => data.onLabelChange?.(id, v)}
          className="text-[11px] font-bold text-gray-900 dark:text-white"
          placeholder="Table title..."
        />
      </div>
      <div className="px-2 pb-2">
        <table className="border-collapse w-full">
          <tbody>
            {tableData.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const isEditing = editCell?.row === ri && editCell?.col === ci;
                  return (
                    <td
                      key={ci}
                      className="border border-gray-200 dark:border-slate-700 p-0"
                      style={{ minWidth: 50 }}
                    >
                      {isEditing ? (
                        <TableCellInput
                          value={cell}
                          onCommit={(v) => { updateCell(ri, ci, v); setEditCell(null); }}
                        />
                      ) : (
                        <div
                          onDoubleClick={(e) => { e.stopPropagation(); setEditCell({ row: ri, col: ci }); }}
                          className="px-1.5 py-1 text-[11px] text-gray-700 dark:text-gray-300 min-h-[22px] cursor-text"
                        >
                          {cell || <span className="text-gray-300 dark:text-slate-600">&nbsp;</span>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 mt-1.5">
          <button onClick={addRow} className="text-[9px] text-primary hover:text-primary-dark font-medium">
            + Row
          </button>
          <button onClick={addColumn} className="text-[9px] text-primary hover:text-primary-dark font-medium">
            + Column
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

function TableCellInput({ value, onCommit }) {
  const [text, setText] = useState(value);
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <input
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(text)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(text);
        if (e.key === 'Escape') onCommit(value);
      }}
      className="w-full px-1.5 py-1 text-[11px] bg-indigo-50 dark:bg-slate-700 text-gray-800 dark:text-gray-200 outline-none border-none"
    />
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
  diamond: DiamondNode,
  oval: OvalNode,
  parallelogram: ParallelogramNode,
  imageUpload: ImageUploadNode,
  checklist: ChecklistNode,
  codeBlock: CodeBlockNode,
  table: TableNode,
};
