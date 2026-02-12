import { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold, Italic, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Link as LinkIcon, ImagePlus,
  Undo2, Redo2, Type, Highlighter,
} from 'lucide-react';

const TEXT_COLORS = [
  { name: 'Default', value: null },
  { name: 'Red', value: '#dc2626' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Gray', value: '#6b7280' },
];

const HIGHLIGHT_COLORS = [
  { name: 'None', value: null },
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Purple', value: '#e9d5ff' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Red', value: '#fecaca' },
  { name: 'Gray', value: '#e5e7eb' },
];

function ColorDropdown({ colors, activeColor, onSelect, icon: Icon, title }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={title}
        className={`p-1.5 rounded transition-colors flex items-center gap-0.5 ${
          activeColor
            ? 'bg-primary/25 text-primary ring-1 ring-primary/40 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
        }`}
      >
        <Icon size={16} />
        {activeColor && (
          <span
            className="w-2 h-2 rounded-full border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: activeColor }}
          />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg p-2 z-50 grid grid-cols-4 gap-1 w-[120px]">
          {colors.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              onClick={() => {
                onSelect(c.value);
                setOpen(false);
              }}
              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                (activeColor === c.value || (!activeColor && !c.value))
                  ? 'border-primary ring-1 ring-primary/40'
                  : 'border-gray-200 dark:border-gray-600'
              }`}
              style={{
                backgroundColor: c.value || (title === 'Text Color' ? '#000000' : '#ffffff'),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuBar({ editor }) {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt('Enter link URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const Btn = ({ onClick, active, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-primary/25 text-primary ring-1 ring-primary/40 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );

  const Sep = () => <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-0.5" />;

  const currentTextColor = editor.getAttributes('textStyle').color || null;
  const currentHighlight = editor.getAttributes('highlight').color || null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b dark:border-slate-700 px-2 py-1.5 bg-gray-50 dark:bg-slate-900/50">
      <Btn title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
        <Bold size={16} />
      </Btn>
      <Btn title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
        <Italic size={16} />
      </Btn>
      <Btn title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
        <Strikethrough size={16} />
      </Btn>
      <Btn title="Inline Code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}>
        <Code size={16} />
      </Btn>
      <Sep />
      <ColorDropdown
        colors={TEXT_COLORS}
        activeColor={currentTextColor}
        onSelect={(color) => {
          if (color) {
            editor.chain().focus().setColor(color).run();
          } else {
            editor.chain().focus().unsetColor().run();
          }
        }}
        icon={Type}
        title="Text Color"
      />
      <ColorDropdown
        colors={HIGHLIGHT_COLORS}
        activeColor={currentHighlight}
        onSelect={(color) => {
          if (color) {
            editor.chain().focus().toggleHighlight({ color }).run();
          } else {
            editor.chain().focus().unsetHighlight().run();
          }
        }}
        icon={Highlighter}
        title="Highlight"
      />
      <Sep />
      <Btn title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
        <Heading1 size={16} />
      </Btn>
      <Btn title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
        <Heading2 size={16} />
      </Btn>
      <Btn title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
        <Heading3 size={16} />
      </Btn>
      <Sep />
      <Btn title="Bullet List" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
        <List size={16} />
      </Btn>
      <Btn title="Numbered List" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
        <ListOrdered size={16} />
      </Btn>
      <Btn title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
        <Quote size={16} />
      </Btn>
      <Btn title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={16} />
      </Btn>
      <Sep />
      <Btn title="Link" onClick={toggleLink} active={editor.isActive('link')}>
        <LinkIcon size={16} />
      </Btn>
      <Btn title="Image" onClick={addImage}>
        <ImagePlus size={16} />
      </Btn>
      <Sep />
      <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={16} />
      </Btn>
      <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={16} />
      </Btn>
    </div>
  );
}

export default function RichTextEditor({ content, placeholder, editorRef }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage,
      TiptapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || 'Start writing...' }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: content || '',
  });

  // Expose editor instance to parent via ref
  if (editorRef) editorRef.current = editor;

  return (
    <div className="border dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
