import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import { getAuthHeaders } from '../api/client';
export default function ChatPanel({ toggleRef }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (toggleRef) toggleRef.current = () => setOpen((o) => !o);
  }, [toggleRef]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const appendToLastAssistant = useCallback((token) => {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant') {
        updated[updated.length - 1] = {
          ...last,
          content: last.content + token,
        };
      }
      return updated;
    });
  }, []);

  const setLastAssistantContent = useCallback((content) => {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant') {
        updated[updated.length - 1] = { ...last, content };
      }
      return updated;
    });
  }, []);

  const sendStreaming = useCallback(async (text) => {
    // Add user message and empty assistant placeholder in one batch
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ message: text, sessionId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        setLastAssistantContent(`Error: ${errText}`);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on newlines — SSE events are separated by \n\n
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.slice(trimmed.indexOf(':') + 1).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.sessionId) {
              setSessionId(data.sessionId);
            }

            if (data.token) {
              appendToLastAssistant(data.token);
            }

            if (data.done) {
              // Stream is complete
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(trimmed.indexOf(':') + 1).trim();
          try {
            const data = JSON.parse(jsonStr);
            if (data.token) {
              appendToLastAssistant(data.token);
            }
          } catch {
            // ignore
          }
        }
      }

      // If after streaming, the assistant message is still empty, show a fallback
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            content: 'No response received. Make sure Ollama is running with llama3.2 pulled.',
          };
          return updated;
        }
        return prev;
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setLastAssistantContent(
        'Could not connect to the AI service. Make sure the server is running and Ollama is available at localhost:11434.'
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [sessionId, appendToLastAssistant, setLastAssistantContent]);

  const send = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendStreaming(text);
  };

  const newSession = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setSessionId(null);
    setLoading(false);
  };

  return (
    <>
      {/* Toggle button — hidden when panel is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-primary-dark text-white p-3.5 rounded-full shadow-lg shadow-primary/30 transition-transform hover:scale-105"
        >
          <MessageCircle size={22} />
        </button>
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-slate-900 shadow-2xl z-40 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-sm">AI Assistant</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={newSession}
              className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30"
            >
              New Chat
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-white/20 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center mt-8 space-y-2">
              <Bot size={32} className="text-primary/30 mx-auto" />
              <p className="text-sm text-gray-400">
                Ask me about your schedule, goals, or anything!
              </p>
              <p className="text-xs text-gray-300 dark:text-gray-600">
                Powered by Ollama (llama3.2)
              </p>
            </div>
          )}
          {messages.map((m, i) => {
            const isLastAssistant = loading && i === messages.length - 1 && m.role === 'assistant';
            const isError = m.role === 'assistant' && m.content && (
              m.content.startsWith('Error') ||
              m.content.startsWith('Could not connect') ||
              m.content.startsWith('No response received') ||
              m.content.startsWith('AI error')
            );

            return (
              <div
                key={i}
                className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isError ? 'bg-red-100 dark:bg-red-500/10' : 'bg-primary/10'
                  }`}>
                    {isError
                      ? <AlertCircle size={14} className="text-red-500" />
                      : <Bot size={14} className="text-primary" />
                    }
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-primary text-white'
                      : isError
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {m.content}
                  {isLastAssistant && (
                    <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <User size={14} className="text-white" />
                  </div>
                )}
              </div>
            );
          })}
          {loading && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant') && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="bg-gray-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                <Loader2 size={16} className="text-primary animate-spin" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t dark:border-slate-700 p-3 shrink-0">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Type a message..."
              className="flex-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="btn-gradient p-2 rounded-lg disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
