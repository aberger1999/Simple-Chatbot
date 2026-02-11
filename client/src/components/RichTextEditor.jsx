import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Link as LinkIcon, ImagePlus,
  Undo2, Redo2,
} from 'lucide-react';

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
