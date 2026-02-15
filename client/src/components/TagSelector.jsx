import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Pencil, Trash2, Plus, Check, ChevronDown } from 'lucide-react';
import { tagsApi } from '../api/client';

export default function TagSelector({ selectedTags, onChange }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState(null);
  const [editName, setEditName] = useState('');
  const containerRef = useRef(null);
  const filterRef = useRef(null);
  const createRef = useRef(null);
  const editRef = useRef(null);

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getTags,
  });

  const presetTags = tagsData?.presetTags || [];
  const customTags = tagsData?.customTags || [];
  const customTagNames = customTags.map((t) => t.name);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setCreating(false);
        setEditingTagId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus filter input when dropdown opens
  useEffect(() => {
    if (open && filterRef.current) filterRef.current.focus();
  }, [open]);

  // Focus create input
  useEffect(() => {
    if (creating && createRef.current) createRef.current.focus();
  }, [creating]);

  // Focus edit input
  useEffect(() => {
    if (editingTagId && editRef.current) editRef.current.focus();
  }, [editingTagId]);

  const createMut = useMutation({
    mutationFn: tagsApi.createTag,
    onSuccess: (newTag) => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      onChange([...selectedTags, newTag.name]);
      setNewTagName('');
      setCreating(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }) => tagsApi.updateTag(id, name),
    onSuccess: (updatedTag) => {
      const oldTag = customTags.find((t) => t.id === editingTagId);
      if (oldTag) {
        onChange(selectedTags.map((t) => (t === oldTag.name ? updatedTag.name : t)));
      }
      qc.invalidateQueries({ queryKey: ['tags'] });
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['thought-posts'] });
      setEditingTagId(null);
      setEditName('');
    },
  });

  const deleteMut = useMutation({
    mutationFn: tagsApi.deleteTag,
    onSuccess: (_, deletedId) => {
      const deleted = customTags.find((t) => t.id === deletedId);
      if (deleted) {
        onChange(selectedTags.filter((t) => t !== deleted.name));
      }
      qc.invalidateQueries({ queryKey: ['tags'] });
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['thought-posts'] });
    },
  });

  const toggleTag = (tagName) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onChange([...selectedTags, tagName]);
    }
  };

  const removeTag = (tagName) => {
    onChange(selectedTags.filter((t) => t !== tagName));
  };

  const handleCreate = () => {
    const name = newTagName.trim().toLowerCase();
    if (name) createMut.mutate(name);
  };

  const handleUpdate = () => {
    const name = editName.trim().toLowerCase();
    if (name && editingTagId) updateMut.mutate({ id: editingTagId, name });
  };

  const handleDelete = (tagId) => {
    if (window.confirm('Delete this custom tag? It will be removed from all notes and posts.')) {
      deleteMut.mutate(tagId);
    }
  };

  const isCustom = (tagName) => customTagNames.includes(tagName);
  const getCustomTagId = (tagName) => customTags.find((t) => t.name === tagName)?.id;

  const filteredPresets = presetTags.filter((t) => t.includes(filter.toLowerCase()));
  const filteredCustom = customTags.filter((t) => t.name.includes(filter.toLowerCase()));

  return (
    <div ref={containerRef} className="relative flex-1">
      {/* Selected tags + trigger */}
      <div
        className="flex flex-wrap gap-1.5 items-center min-h-[38px] border dark:border-slate-600 rounded-lg px-2 py-1.5 cursor-pointer dark:bg-slate-800 bg-white"
        onClick={() => setOpen(!open)}
      >
        {selectedTags.map((tag) => {
          const custom = isCustom(tag);
          const tagId = getCustomTagId(tag);

          if (editingTagId && editingTagId === tagId) {
            return (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={editRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdate();
                    if (e.key === 'Escape') { setEditingTagId(null); setEditName(''); }
                  }}
                  className="bg-transparent outline-none w-16 text-xs"
                />
                <button
                  onClick={handleUpdate}
                  className="text-green-600 dark:text-green-400 hover:text-green-700"
                >
                  <Check size={12} />
                </button>
              </span>
            );
          }

          return (
            <span
              key={tag}
              className="flex items-center gap-1 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              {tag}
              {custom && (
                <>
                  <button
                    onClick={() => { setEditingTagId(tagId); setEditName(tag); }}
                    className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
                    title="Edit tag"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onClick={() => handleDelete(tagId)}
                    className="text-indigo-400 hover:text-red-500"
                    title="Delete tag"
                  >
                    <Trash2 size={10} />
                  </button>
                </>
              )}
              <button
                onClick={() => removeTag(tag)}
                className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        {selectedTags.length === 0 && (
          <span className="text-sm text-gray-400">Select tags...</span>
        )}
        <ChevronDown size={14} className="ml-auto text-gray-400 shrink-0" />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Filter */}
          <div className="p-2 border-b dark:border-slate-700">
            <input
              ref={filterRef}
              placeholder="Filter tags..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full text-sm px-2 py-1 border dark:border-slate-600 rounded bg-transparent dark:text-white outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Preset tags */}
          {filteredPresets.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 px-1">
                Common Tags
              </p>
              {filteredPresets.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center justify-between ${
                      selected
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tag}
                    {selected && <Check size={14} className="text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom tags */}
          {filteredCustom.length > 0 && (
            <div className="p-2 border-t dark:border-slate-700">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 px-1">
                My Tags
              </p>
              {filteredCustom.map((tag) => {
                const selected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center justify-between ${
                      selected
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tag.name}
                    {selected && <Check size={14} className="text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Create new tag */}
          <div className="p-2 border-t dark:border-slate-700">
            {creating ? (
              <div className="flex items-center gap-1">
                <input
                  ref={createRef}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') { setCreating(false); setNewTagName(''); }
                  }}
                  placeholder="Tag name..."
                  className="flex-1 text-sm px-2 py-1 border dark:border-slate-600 rounded bg-transparent dark:text-white outline-none"
                />
                <button
                  onClick={handleCreate}
                  className="text-green-600 dark:text-green-400 hover:text-green-700 p-1"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => { setCreating(false); setNewTagName(''); }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left text-sm px-2 py-1.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-1"
              >
                <Plus size={14} /> Create New Tag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
