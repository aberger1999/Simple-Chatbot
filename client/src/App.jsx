import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import NotesPage from './pages/NotesPage';
import GoalsPage from './pages/GoalsPage';
import GoalDetailPage from './pages/GoalDetailPage';
import BlogPage from './pages/BlogPage';
import JournalPage from './pages/JournalPage';
import HabitsPage from './pages/HabitsPage';
import FocusTimerPage from './pages/FocusTimerPage';
import CanvasPage from './pages/CanvasPage';
import TodoPage from './pages/TodoPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/notes/:id" element={<NotesPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/goals/:id" element={<GoalDetailPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/focus" element={<FocusTimerPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/canvas" element={<CanvasPage />} />
            <Route path="/todos" element={<TodoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
