import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ToggleLeft, ToggleRight } from 'lucide-react';
import { chatApi } from '../api/client';

export default function ChatPanel({ toggleRef }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('ollama'); // ollama | legacy
  const [sessionId, setSessionId] = useState(null);
  const bottomRef = useRef(null);

  // Expose toggle to parent for keyboard shortcut
  useEffect(() => {
    if (toggleRef) toggleRef.current = () => setOpen((o) => !o);
  }, [toggleRef]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const data = await chatApi.send(text, mode, sessionId);
      setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error connecting to server.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const newSession = () => {
    setMessages([]);
    setSessionId(null);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-primary-dark text-white p-3.5 rounded-full shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-slate-900 shadow-2xl z-40 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">
              {mode === 'ollama' ? 'AI Assistant' : 'Legacy Bot (Sam)'}
            </h2>
            <button
              onClick={() => setMode(mode === 'ollama' ? 'legacy' : 'ollama')}
              className="text-xs text-indigo-200 hover:text-white flex items-center gap-1 mt-0.5"
            >
              {mode === 'ollama' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              Switch to {mode === 'ollama' ? 'Legacy' : 'AI'}
            </button>
          </div>
          <button
            onClick={newSession}
            className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30"
          >
            New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-gray-400 text-center mt-8">
              {mode === 'ollama'
                ? 'Ask me about your schedule, goals, or anything!'
                : 'Chat with the legacy LangBot!'}
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-primary" />
                </div>
              )}
              <div
                className={`max-w-[75%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200'
                }`}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User size={14} className="text-white" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="bg-gray-100 dark:bg-slate-800 px-3 py-2 rounded-lg text-sm text-gray-500">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t dark:border-slate-700 p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message..."
              className="flex-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-primary-dark text-white p-2 rounded-lg disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
