import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowLeft, Trash2 } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import TagSelector from '../components/TagSelector';
import { blogApi, goalsApi } from '../api/client';

function PostEditor({ post, onClose, goals }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(post?.title || '');
  const [summary, setSummary] = useState(post?.summary || '');
  const [tags, setTags] = useState(
    post?.tags ? post.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
  );
  const [goalId, setGoalId] = useState(post?.goalId || '');
  const editorRef = useRef(null);

  const saveMut = useMutation({
    mutationFn: (data) =>
      post?.id ? blogApi.updatePost(post.id, data) : blogApi.createPost(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog'] });
      onClose();
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => blogApi.deletePost(post.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog'] });
      onClose();
    },
  });

  const handleSave = () => {
    saveMut.mutate({
      title,
      content: editorRef.current?.getHTML() || '',
      summary,
      tags: tags.join(','),
      goalId: goalId || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <ArrowLeft size={16} /> Back to posts
        </button>
        <div className="flex gap-2">
          {post?.id && (
            <button
              onClick={() => deleteMut.mutate()}
              className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button
            onClick={handleSave}
            className="bg-primary hover:bg-primary-dark text-white text-sm px-4 py-2 rounded-lg"
          >
            Publish
          </button>
        </div>
      </div>

      <input
        placeholder="Post title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-semibold border-0 border-b dark:border-slate-700 pb-2 outline-none bg-transparent text-gray-900 dark:text-white"
      />

      <div className="grid grid-cols-3 gap-3">
        <input
          placeholder="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="col-span-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-white"
        />
        <div className="col-span-2 flex gap-3">
          <div className="flex-[2] min-w-0">
            <TagSelector selectedTags={tags} onChange={setTags} />
          </div>
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="flex-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-white"
          >
            <option value="">No goal</option>
            {goals?.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      </div>

      <RichTextEditor
        content={post?.content || ''}
        placeholder="Write your blog post..."
        editorRef={editorRef}
      />
    </div>
  );
}

export default function BlogPage() {
  const [editing, setEditing] = useState(null);

  const { data: posts = [] } = useQuery({
    queryKey: ['blog'],
    queryFn: () => blogApi.getPosts(),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.getGoals(),
  });

  if (editing !== null) {
    return (
      <PostEditor
        post={editing}
        goals={goals}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog</h1>
        <button
          onClick={() => setEditing({})}
          className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-white text-sm px-3 py-2 rounded-lg"
        >
          <Plus size={16} /> New Post
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => setEditing(post)}
            className="text-left bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {post.title || 'Untitled'}
              </h3>
              {post.summary && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{post.summary}</p>
              )}
              <p className="text-xs text-gray-400 line-clamp-2">
                {post.content?.replace(/<[^>]*>/g, '').slice(0, 200)}
              </p>
              {post.tags && (
                <div className="flex gap-1 mt-3 flex-wrap">
                  {post.tags.split(',').filter(Boolean).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </button>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>No blog posts yet. Write your first one!</p>
        </div>
      )}
    </div>
  );
}
