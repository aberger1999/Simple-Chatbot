import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  StickyNote,
  Target,
  MessageSquare,
  BookMarked,
  Activity,
  Timer,
  PenTool,
  ListTodo,
  Moon,
  Sun,
  LogOut,
  Settings,
} from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { useAuth } from '../hooks/useAuth';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/journal', icon: BookMarked, label: 'Journal' },
  { to: '/habits', icon: Activity, label: 'Habits' },
  { to: '/focus', icon: Timer, label: 'Focus Timer' },
  { to: '/todos', icon: ListTodo, label: 'To-Do' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/canvas', icon: PenTool, label: 'Canvas' },
  { to: '/thoughts', icon: MessageSquare, label: 'Thoughts' },
];

export default function Sidebar() {
  const [dark, setDark] = useDarkMode();
  const { user, logout } = useAuth();

  return (
    <aside className="w-56 bg-sidebar text-white flex flex-col shrink-0 h-screen sticky top-0">
      <div className="p-4 border-b border-sidebar-hover">
        <h1 className="text-lg font-bold tracking-tight">Productivity Hub</h1>
      </div>
      <nav className="flex-1 py-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-hover text-white font-medium'
                  : 'text-indigo-200 hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-hover">
        {user && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-indigo-200 truncate">{user.name || user.email}</span>
            <div className="flex items-center gap-2">
              <NavLink
                to="/settings"
                className="text-indigo-400 hover:text-white transition-colors"
                title="Settings"
              >
                <Settings size={14} />
              </NavLink>
              <button
                onClick={logout}
                className="text-indigo-400 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setDark(!dark)}
          className="flex items-center gap-2 text-xs text-indigo-300 hover:text-white transition-colors w-full"
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <p className="text-xs text-indigo-400 mt-2">Ctrl+K chat &middot; Ctrl+N note</p>
      </div>
    </aside>
  );
}
