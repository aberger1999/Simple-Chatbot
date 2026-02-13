import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, StickyNote, Target, Plus, BookMarked } from 'lucide-react';
import { calendarApi, notesApi, goalsApi } from '../api/client';

export default function Dashboard() {
  const today = new Date();
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59);
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const { data: events = [] } = useQuery({
    queryKey: ['events', 'today'],
    queryFn: () => calendarApi.getEvents(today.toISOString(), weekAhead.toISOString()),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', 'recent'],
    queryFn: () => notesApi.getNotes(),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.getGoals(),
  });

  const todayEvents = events.filter((e) => {
    const start = new Date(e.start);
    return start.toDateString() === today.toDateString();
  });

  const activeGoals = goals.filter((g) => g.status === 'active');
  const recentNotes = notes.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {today.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/notes?new=1"
            className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-white text-sm px-3 py-2 rounded-lg"
          >
            <Plus size={16} /> Note
          </Link>
          <Link
            to="/journal"
            className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-white text-sm px-3 py-2 rounded-lg"
          >
            <BookMarked size={16} /> Journal
          </Link>
          <Link
            to="/calendar?new=1"
            className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-white text-sm px-3 py-2 rounded-lg"
          >
            <Plus size={16} /> Event
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Events */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-primary" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Today's Events</h2>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-gray-400">No events today</p>
          ) : (
            <ul className="space-y-2">
              {todayEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-2">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: e.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/calendar" className="text-xs text-primary hover:underline mt-3 block">
            View calendar
          </Link>
        </div>

        {/* Active Goals */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-primary" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Active Goals</h2>
          </div>
          {activeGoals.length === 0 ? (
            <p className="text-sm text-gray-400">No active goals</p>
          ) : (
            <ul className="space-y-3">
              {activeGoals.slice(0, 5).map((g) => (
                <li key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{g.title}</span>
                    <span className="text-gray-400">{g.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${g.progress}%`, backgroundColor: g.color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/goals" className="text-xs text-primary hover:underline mt-3 block">
            View all goals
          </Link>
        </div>

        {/* Recent Notes */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <StickyNote size={18} className="text-primary" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Notes</h2>
          </div>
          {recentNotes.length === 0 ? (
            <p className="text-sm text-gray-400">No notes yet</p>
          ) : (
            <ul className="space-y-2">
              {recentNotes.map((n) => (
                <li key={n.id}>
                  <Link
                    to={`/notes/${n.id}`}
                    className="block text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-primary"
                  >
                    {n.title}
                  </Link>
                  <p className="text-xs text-gray-400 truncate">{n.content?.slice(0, 60)}</p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/notes" className="text-xs text-primary hover:underline mt-3 block">
            View all notes
          </Link>
        </div>
      </div>

      {/* Upcoming this week */}
      {events.length > 0 && (
        <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Upcoming This Week</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {events.slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <div
                  className="w-1 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: e.color }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(e.start).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
