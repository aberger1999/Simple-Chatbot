# CLAUDE.md — Chatbot-Base

## What is this project?

A personal productivity app with Calendar, Notes, Goals/Vision Board, Thoughts, Journal, Habits, Focus Timer, To-Do Lists, Canvas, and AI Chat. Uses JWT authentication with user-scoped data.

## Tech Stack

- **Backend:** FastAPI (async) + SQLAlchemy 2.0 (asyncpg) + PostgreSQL (Supabase)
- **Frontend:** React 19 (Vite 7) + Tailwind CSS v4 + React Router v7
- **AI:** Ollama (default model: llama3.2)
- **Auth:** JWT (python-jose) + bcrypt (passlib)
- **Key libs:** react-big-calendar, @tanstack/react-query, react-simplemde-editor, date-fns, lucide-react, httpx, pydantic-settings, alembic

## Project Structure

```
server/                     FastAPI backend
  main.py                   FastAPI app, router registration, SPA serving, lifespan
  config.py                 Pydantic Settings (env: DATABASE_URL, JWT_SECRET_KEY, OLLAMA_*)
  database.py               Async SQLAlchemy engine, session factory, get_db dependency
  auth.py                   JWT auth: hash_password, verify_password, create_access_token, get_current_user
  models/                   SQLAlchemy 2.0 models (Mapped style, user_id scoped)
    base.py                 DeclarativeBase
    user.py                 User (auth)
    calendar_event.py       CalendarEvent
    note.py                 Note
    goal.py                 Goal, Milestone, SubMilestone
    journal.py              JournalEntry
    habit.py                HabitLog, CustomHabit, CustomHabitLog
    chat_message.py         ChatMessage
    tag.py                  CustomTag
    thought.py              Community, ThoughtPost, Comment, Vote
    focus.py                FocusSession
    canvas.py               CanvasBoard
    todo.py                 TodoList, TodoItem
    __init__.py             Imports all models for Alembic discovery
  routes/                   FastAPI APIRouters, all mounted under /api
    auth.py                 POST /api/auth/register, /api/auth/login
    calendar.py, notes.py, goals.py, milestones.py, journal.py, habits.py
    chat.py, focus.py, canvas.py, todos.py, thoughts.py, activity.py, tags.py
  services/
    ollama_service.py       Async httpx calls to Ollama /api/chat
    context_builder.py      Async — injects user data into AI system prompt
    recurrence.py           Pure Python recurring event expansion

client/                     React frontend (Vite)
  src/
    App.jsx                 Router + QueryClientProvider + AuthProvider
    api/client.js           Fetch wrappers for all API endpoints
    hooks/useAuth.jsx       Auth context with JWT token management
    components/
      Layout.jsx            Sidebar + Outlet + ChatPanel, keyboard shortcuts (Ctrl+K, Ctrl+N)
      Sidebar.jsx           Navigation + dark mode toggle + user display/logout
      ProtectedRoute.jsx    Route guard for authenticated routes
      ChatPanel.jsx         Sliding AI chat drawer
    pages/
      LoginPage.jsx, RegisterPage.jsx
      Dashboard.jsx, CalendarPage.jsx, NotesPage.jsx, GoalsPage.jsx
      CanvasPage.jsx, JournalPage.jsx, HabitsPage.jsx, FocusPage.jsx
      TodoPage.jsx, ThoughtsPage.jsx
    hooks/useDarkMode.js    localStorage + system preference, toggles .dark on <html>
    utils/holidays.js       US federal + observance holidays (computed)
    index.css               Tailwind v4 imports, calendar styling, SimpleMDE dark mode

alembic/                    Database migrations
  env.py                    Uses sync DATABASE_URL from settings
  script.py.mako            Migration template
  versions/                 Migration scripts
alembic.ini                 Alembic configuration
.env                        Environment variables (gitignored)
.env.example                Template for environment variables
```

## Running the App

**Development (two terminals):**
```bash
# Terminal 1 — FastAPI (port 5000)
uvicorn server.main:app --reload --port 5000
# or: python -m server.main

# Terminal 2 — Vite dev server (port 5173, proxies /api to FastAPI)
cd client && npm run dev
```

**Production:**
```bash
cd client && npx vite build    # outputs to client/dist/
uvicorn server.main:app --port 5000  # serves everything on port 5000
```

**Ollama (optional, for AI chat):**
```bash
ollama run llama3.2             # or set OLLAMA_MODEL env var
```

**Database migrations:**
```bash
alembic revision --autogenerate -m "description"  # generate migration
alembic upgrade head                               # apply migrations
```

## Key Architecture Decisions

- **FastAPI + async:** All route handlers are async, using SQLAlchemy 2.0 async sessions
- **JWT Auth:** Every API route (except /auth/register and /auth/login) requires `get_current_user` dependency
- **User-scoped data:** Every model has `user_id` FK; all queries filter by `user.id`
- **SPA serving:** FastAPI serves `client/dist/` with catch-all fallback to `index.html`
- **Vite proxy:** `/api` requests forwarded to `localhost:5000` during development
- **Tailwind v4:** CSS-first config. Uses `@tailwindcss/vite` plugin. Dark mode via `@custom-variant dark (&:where(.dark, .dark *))` in `index.css`
- **Theme colors:** Defined in `@theme {}` block in `index.css` (--color-primary, --color-sidebar, etc.)
- **react-big-calendar:** Controlled component — must pass `date`, `view`, `onNavigate`, `onView` props
- **React Query:** 30s staleTime, 1 retry. Mutations invalidate relevant query keys
- **Goals** are the hub entity — notes, thought posts, and calendar events link to a goal via `goal_id` FK
- **Chat** uses Ollama with async LLM streaming and user context injection
- **Alembic** for schema migrations; `create_all` also runs at startup for dev convenience

## Database

PostgreSQL on Supabase. 14 tables: `users`, `calendar_events`, `notes`, `goals`, `milestones`, `sub_milestones`, `journal_entries`, `habit_logs`, `custom_habits`, `custom_habit_logs`, `chat_messages`, `custom_tags`, `communities`, `thought_posts`, `comments`, `votes`, `focus_sessions`, `canvas_boards`, `todo_lists`, `todo_items`.

## API Routes

All prefixed with `/api`. All except auth require Bearer token.

**Auth:**
- `POST /api/auth/register` — `{name, email, password}` → `{token, user}`
- `POST /api/auth/login` — `{email, password}` → `{token, user}`

**Calendar:** `GET/POST /api/calendar`, `GET /api/calendar/categories`, `GET/PUT/DELETE /api/calendar/{id}`
**Notes:** `GET/POST /api/notes`, `GET/PUT/DELETE /api/notes/{id}`
**Goals:** `GET/POST /api/goals`, `GET/PUT/DELETE /api/goals/{id}`
**Milestones:** `GET/POST /api/goals/{id}/milestones`, `PUT/DELETE /api/milestones/{id}`, `POST /api/milestones/{id}/sub`, `PUT/DELETE /api/sub-milestones/{id}`
**Journal:** `GET /api/journal/recent`, `GET/PUT /api/journal/{date}`
**Habits:** `GET /api/habits/week`, `PUT/DELETE /api/habits/log/{date}/{category}`, `GET/POST /api/habits/custom`, `PUT/DELETE /api/habits/custom/{id}`, `PUT /api/habits/custom-log/{date}/{habit_id}`
**Chat:** `POST /api/chat`, `POST /api/chat/stream`, `GET /api/chat/history`, `GET/POST /api/chat/sessions`
**Focus:** `GET/POST /api/focus-sessions`, `GET /api/focus-sessions/stats`, `GET/PUT/DELETE /api/focus-sessions/{id}`
**Canvas:** `GET/POST /api/canvas/boards`, `GET/PUT/DELETE /api/canvas/boards/{id}`
**Todos:** `GET/POST /api/todos/lists`, `PUT/DELETE /api/todos/lists/{id}`, `GET/POST /api/todos/lists/{id}/items`, `PUT/DELETE /api/todos/items/{id}`
**Thoughts:** `GET/POST /api/thoughts/communities`, `DELETE /api/thoughts/communities/{id}`, `GET/POST /api/thoughts/posts`, `GET/PUT/DELETE /api/thoughts/posts/{id}`, `POST /api/thoughts/posts/{id}/comments`, `DELETE /api/thoughts/comments/{id}`, `POST /api/thoughts/vote`
**Activity:** `GET /api/activity-feed`
**Tags:** `GET/POST /api/tags`, `PUT/DELETE /api/tags/{id}`

## Common Gotchas

- **Tailwind v4 dark mode:** Must use `@custom-variant dark` in CSS, not `darkMode: 'class'` in a config file. Tailwind v4 has no `tailwind.config.js` — configuration is CSS-first
- **react-big-calendar styling:** All calendar CSS lives in `index.css` with explicit light and dark mode selectors
- **DateCellWrapper:** Uses `React.cloneElement` to inject content into existing calendar cells — do NOT wrap children in extra divs
- **Models use camelCase** in their `to_dict()` JSON output (e.g., `goalId`, `allDay`, `sessionId`)
- **Alembic uses sync driver** (psycopg2) while the app uses async (asyncpg). The `config.py` `async_database_url` property handles this conversion
- **Auth tokens:** Frontend stores JWT in localStorage and sends it as `Authorization: Bearer <token>` header
