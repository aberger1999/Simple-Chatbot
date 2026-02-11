import { useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';

export default function Layout() {
  const chatToggleRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      // Ctrl+K — toggle chat
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        chatToggleRef.current?.();
      }
      // Ctrl+N — new note
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        navigate('/notes?new=1');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <ChatPanel toggleRef={chatToggleRef} />
    </div>
  );
}
