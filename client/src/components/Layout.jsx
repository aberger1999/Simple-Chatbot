import { useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';

const FULL_BLEED_ROUTES = ['/canvas', '/todos'];

export default function Layout() {
  const chatToggleRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isFullBleed = FULL_BLEED_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    const handler = (e) => {
      // Ctrl+K — toggle chat
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        chatToggleRef.current?.();
      }
      // Ctrl+J — journal
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        navigate('/journal');
      }
      // Ctrl+H — habits
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        navigate('/habits');
      }
      // Ctrl+F — focus timer
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        navigate('/focus');
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
      <main className={`flex-1 ${isFullBleed ? 'overflow-hidden' : 'overflow-auto'}`}>
        {isFullBleed ? (
          <Outlet />
        ) : (
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        )}
      </main>
      <ChatPanel toggleRef={chatToggleRef} />
    </div>
  );
}
