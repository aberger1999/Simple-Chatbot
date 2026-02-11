# CLAUDE.md — Chatbot-Base

## What is this project?

A single-user personal productivity app with Calendar, Notes, Goals/Vision Board, Blog, and AI Chat. No authentication — it's a personal tool. The original PyTorch intent-based chatbot is preserved as "Legacy Mode" alongside the newer Ollama-powered AI assistant.

## Tech Stack

- **Backend:** Flask (app factory) + SQLAlchemy + SQLite (`instance/app.db`)
- **Frontend:** React 19 (Vite 7) + Tailwind CSS v4 + React Router v7
- **AI:** Ollama (default model: Mistral) + Legacy PyTorch chatbot
- **Key libs:** react-big-calendar, @tanstack/react-query, react-simplemde-editor, date-fns, lucide-react

## Project Structure

```
server/                     Flask API backend
  app.py                    App factory, blueprint registration, SPA catch-all
  config.py                 DB URI, Ollama URL/model (env vars: OLLAMA_BASE_URL, OLLAMA_MODEL)
  models/                   SQLAlchemy models (base.py has db instance)
    calendar_event.py, note.py, goal.py, blog_post.py, chat_message.py
  routes/                   Blueprints, all routes prefixed /api/
    calendar.py, notes.py, goals.py, blog.py, chat.py
  services/
    ollama_service.py       Calls Ollama /api/chat endpoint
    context_builder.py      Injects user data (events, goals, notes) into AI system prompt
    legacy_chat.py          Wraps old PyTorch chatbot
  legacy/                   Original chatbot files (model.py, chat.py, nltk_utils.py, train.py, intents.json)

client/                     React frontend (Vite)
  src/
    App.jsx                 Router + QueryClientProvider
    api/client.js           Fetch wrappers for all API endpoints
    components/
      Layout.jsx            Sidebar + Outlet + ChatPanel, keyboard shortcuts (Ctrl+K, Ctrl+N)
      Sidebar.jsx           Navigation + dark mode toggle
      ChatPanel.jsx         Sliding drawer, ollama/legacy mode toggle
    hooks/
      useDarkMode.js        localStorage + system preference, toggles .dark on <html>
    pages/
      Dashboard.jsx, CalendarPage.jsx, NotesPage.jsx, GoalsPage.jsx, BlogPage.jsx
    utils/
      holidays.js           US federal + observance holidays (computed, not hardcoded)
    index.css               Tailwind v4 imports, calendar styling (light + dark), SimpleMDE dark mode

instance/                   SQLite database (gitignored)
```

## Running the App

**Development (two terminals):**
```bash
# Terminal 1 — Flask API (port 5000)
python -m server.app

# Terminal 2 — Vite dev server (port 5173, proxies /api to Flask)
cd client && npm run dev
```

**Production:**
```bash
cd client && npx vite build    # outputs to client/dist/
python -m server.app            # serves everything on port 5000
```

**Ollama (optional, for AI chat):**
```bash
ollama run mistral              # or set OLLAMA_MODEL env var
```

## Key Architecture Decisions

- **SPA serving:** Flask's `@app.errorhandler(404)` returns `index.html` for client-side routing (not a catch-all route)
- **Vite proxy:** `/api` requests forwarded to `localhost:5000` during development
- **Tailwind v4:** CSS-first config. Uses `@tailwindcss/vite` plugin. Dark mode via `@custom-variant dark (&:where(.dark, .dark *))` in `index.css` — class-based, not media query
- **Theme colors:** Defined in `@theme {}` block in `index.css` (--color-primary, --color-sidebar, etc.)
- **react-big-calendar:** Controlled component — must pass `date`, `view`, `onNavigate`, `onView` props. Calendar CSS overrides are extensive in `index.css` (light + dark mode for month/week/day views)
- **React Query:** 30s staleTime, 1 retry. Mutations invalidate relevant query keys
- **Goals** are the hub entity — notes, blog posts, and calendar events can all link to a goal via `goal_id` FK
- **Chat** supports two modes: `ollama` (LLM with context injection) and `legacy` (PyTorch bag-of-words classifier with 75% confidence threshold)

## Database

5 tables: `calendar_events`, `notes`, `goals`, `blog_posts`, `chat_messages`. Created automatically via `db.create_all()` on startup. SQLite file at `instance/app.db`.

## API Routes

All prefixed with `/api`:
- `GET/POST /api/calendar` — range filtering via `?start=&end=`
- `GET/PUT/DELETE /api/calendar/<id>`
- `GET/POST /api/notes` — filtering via `?search=&tag=&goal_id=`
- `GET/PUT/DELETE /api/notes/<id>`
- `GET/POST /api/goals`, `GET/PUT/DELETE /api/goals/<id>`
- `GET/POST /api/blog`, `GET/PUT/DELETE /api/blog/<id>`
- `POST /api/chat` — body: `{message, mode, session_id}`
- `GET /api/chat/history`, `GET/POST /api/chat/sessions`

## Common Gotchas

- **Tailwind v4 dark mode:** Must use `@custom-variant dark` in CSS, not `darkMode: 'class'` in a config file. Tailwind v4 has no `tailwind.config.js` — configuration is CSS-first
- **react-big-calendar styling:** All calendar CSS lives in `index.css` with explicit light and dark mode selectors. The calendar imports its own CSS (`react-big-calendar/lib/css/react-big-calendar.css`) which must come before custom overrides
- **DateCellWrapper:** Uses `React.cloneElement` to inject content into existing calendar cells — do NOT wrap children in extra divs as this breaks the flex layout
- **Legacy chatbot:** Requires `data.pth` (trained model weights) in `server/legacy/`. Generate by running `python -m server.legacy.train`
- **Models use camelCase** in their `to_dict()` JSON output (e.g., `goalId`, `allDay`, `sessionId`)
