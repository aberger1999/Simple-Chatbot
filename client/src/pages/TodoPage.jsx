import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, List, Trash2, Check, ChevronDown, ChevronRight, Circle,
  CheckCircle2, MoreHorizontal, Pencil, X,
} from 'lucide-react';
import { todosApi } from '../api/client';

export default function TodoPage() {
  const queryClient = useQueryClient();
  const [activeListId, setActiveListId] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [renamingListId, setRenamingListId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [contextMenuListId, setContextMenuListId] = useState(null);

  const newListInputRef = useRef(null);
  const newTaskInputRef = useRef(null);
  const editInputRef = useRef(null);
  const renameInputRef = useRef(null);
  const contextMenuRef = useRef(null);

  // --- Queries ---
  const { data: lists = [] } = useQuery({
    queryKey: ['todo-lists'],
    queryFn: todosApi.getLists,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['todo-items', activeListId],
    queryFn: () => todosApi.getItems(activeListId),
    enabled: !!activeListId,
  });

  // Auto-select first list
  useEffect(() => {
    if (lists.length > 0 && !activeListId) {
      setActiveListId(lists[0].id);
    }
  }, [lists, activeListId]);

  // Focus inputs when they appear
  useEffect(() => {
    if (addingList) newListInputRef.current?.focus();
  }, [addingList]);

  useEffect(() => {
    if (editingItemId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItemId]);

  useEffect(() => {
    if (renamingListId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingListId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenuListId) return;
    const handler = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenuListId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenuListId]);

  // --- Mutations ---
  const createListMut = useMutation({
    mutationFn: (name) => todosApi.createList(name),
    onSuccess: (list) => {
      queryClient.invalidateQueries({ queryKey: ['todo-lists'] });
      setActiveListId(list.id);
      setAddingList(false);
      setNewListName('');
    },
  });

  const updateListMut = useMutation({
    mutationFn: ({ id, data }) => todosApi.updateList(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todo-lists'] }),
  });

  const deleteListMut = useMutation({
    mutationFn: (id) => todosApi.deleteList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-lists'] });
      if (activeListId === deleteListMut.variables) {
        setActiveListId(null);
      }
    },
  });

  const createItemMut = useMutation({
    mutationFn: ({ listId, text }) => todosApi.createItem(listId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-items', activeListId] });
      queryClient.invalidateQueries({ queryKey: ['todo-lists'] });
      setNewTaskText('');
    },
  });

  const updateItemMut = useMutation({
    mutationFn: ({ id, data }) => todosApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-items', activeListId] });
      queryClient.invalidateQueries({ queryKey: ['todo-lists'] });
    },
  });

  const deleteItemMut = useMutation({
    mutationFn: (id) => todosApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-items', activeListId] });
      queryClient.invalidateQueries({ queryKey: ['todo-lists'] });
    },
  });

  // --- Handlers ---
  const handleCreateList = () => {
    const name = newListName.trim();
    if (!name) return;
    createListMut.mutate(name);
  };

  const handleCreateItem = () => {
    const text = newTaskText.trim();
    if (!text || !activeListId) return;
    createItemMut.mutate({ listId: activeListId, text });
  };

  const handleToggleComplete = (item) => {
    updateItemMut.mutate({ id: item.id, data: { completed: !item.completed } });
  };

  const handleEditCommit = (id) => {
    const text = editingText.trim();
    if (text && text !== items.find((i) => i.id === id)?.text) {
      updateItemMut.mutate({ id, data: { text } });
    }
    setEditingItemId(null);
  };

  const handleRenameCommit = (id) => {
    const name = renameText.trim();
    if (name) {
      updateListMut.mutate({ id, data: { name } });
    }
    setRenamingListId(null);
  };

  const handleDeleteList = (id) => {
    setContextMenuListId(null);
    deleteListMut.mutate(id);
  };

  const activeList = lists.find((l) => l.id === activeListId);
  const pendingItems = items.filter((i) => !i.completed);
  const completedItems = items.filter((i) => i.completed);

  return (
    <div className="flex h-screen">
      {/* Inner sidebar — list selector */}
      <div className="shrink-0 w-56 bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col">
        <div className="px-4 py-4 border-b dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">My Lists</h2>
        </div>

        <nav className="flex-1 overflow-auto py-1">
          {lists.map((l) => (
            <div key={l.id} className="relative group">
              {renamingListId === l.id ? (
                <div className="px-3 py-1.5">
                  <input
                    ref={renameInputRef}
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={() => handleRenameCommit(l.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameCommit(l.id);
                      if (e.key === 'Escape') setRenamingListId(null);
                    }}
                    className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setActiveListId(l.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    l.id === activeListId
                      ? 'bg-primary/10 text-primary font-medium dark:bg-primary/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <List size={16} className="shrink-0" />
                  <span className="flex-1 truncate text-left">{l.name}</span>
                  {l.itemCount > 0 && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 rounded-full px-1.5 py-0.5 shrink-0">
                      {l.itemCount}
                    </span>
                  )}
                </button>
              )}

              {/* List context button */}
              {renamingListId !== l.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setContextMenuListId(contextMenuListId === l.id ? null : l.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-slate-700 transition-opacity"
                >
                  <MoreHorizontal size={14} className="text-gray-400" />
                </button>
              )}

              {/* List context menu */}
              {contextMenuListId === l.id && (
                <div ref={contextMenuRef} className="absolute right-2 top-full z-50 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                  <button
                    onClick={() => { setRenamingListId(l.id); setRenameText(l.name); setContextMenuListId(null); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    onClick={() => handleDeleteList(l.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* New list input */}
        <div className="px-3 py-3 border-t dark:border-slate-800 shrink-0">
          {addingList ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={newListInputRef}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateList();
                  if (e.key === 'Escape') { setAddingList(false); setNewListName(''); }
                }}
                placeholder="List name..."
                className="flex-1 px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-600 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={() => { setAddingList(false); setNewListName(''); }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingList(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              <Plus size={16} /> New List
            </button>
          )}
        </div>
      </div>

      {/* Main content — task area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-950">
        {activeList ? (
          <>
            {/* Header */}
            <div className="px-8 py-5 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{activeList.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {pendingItems.length} task{pendingItems.length !== 1 ? 's' : ''} remaining
                {completedItems.length > 0 && ` \u00b7 ${completedItems.length} completed`}
              </p>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-auto px-8 py-4">
              {pendingItems.length === 0 && completedItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                  <CheckCircle2 size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">No tasks yet. Add one below!</p>
                </div>
              )}

              {/* Pending tasks */}
              <div className="space-y-1">
                {pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800/80 shadow-sm card-elevated group hover:shadow-md transition-shadow"
                  >
                    <button
                      onClick={() => handleToggleComplete(item)}
                      className="shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary transition-colors flex items-center justify-center"
                    >
                      {/* empty circle */}
                    </button>

                    {editingItemId === item.id ? (
                      <input
                        ref={editInputRef}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => handleEditCommit(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditCommit(item.id);
                          if (e.key === 'Escape') setEditingItemId(null);
                        }}
                        className="flex-1 text-sm bg-transparent outline-none border-b border-primary/40 text-gray-800 dark:text-gray-200 py-0.5"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => { setEditingItemId(item.id); setEditingText(item.text); }}
                        className="flex-1 text-sm text-gray-800 dark:text-gray-200 cursor-text"
                      >
                        {item.text}
                      </span>
                    )}

                    <button
                      onClick={() => deleteItemMut.mutate(item.id)}
                      className="shrink-0 p-1 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Completed section */}
              {completedItems.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-2 transition-colors"
                  >
                    {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    Completed ({completedItems.length})
                  </button>

                  {showCompleted && (
                    <div className="space-y-1">
                      {completedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-slate-900/60 rounded-xl border dark:border-slate-800/60 group"
                        >
                          <button
                            onClick={() => handleToggleComplete(item)}
                            className="shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                          >
                            <Check size={12} className="text-white" />
                          </button>

                          <span className="flex-1 text-sm text-gray-400 dark:text-gray-500 line-through">
                            {item.text}
                          </span>

                          <button
                            onClick={() => deleteItemMut.mutate(item.id)}
                            className="shrink-0 p-1 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick-add input */}
            <div className="px-8 py-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                <Plus size={18} className="text-amber-400 shrink-0" />
                <input
                  ref={newTaskInputRef}
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateItem();
                  }}
                  placeholder="Add a task..."
                  className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-amber-400/60 dark:placeholder-amber-500/40"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <List size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-400 dark:text-gray-500 mb-3">
                {lists.length === 0 ? 'Create your first list to get started' : 'Select a list'}
              </p>
              {lists.length === 0 && (
                <button
                  onClick={() => setAddingList(true)}
                  className="flex items-center gap-2 px-4 py-2 btn-gradient text-white text-sm rounded-lg mx-auto"
                >
                  <Plus size={16} /> New List
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
