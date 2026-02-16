import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from server.database import engine
from server.models.base import Base
import server.models  # noqa: F401 — register all models

from server.routes.auth import router as auth_router
from server.routes.calendar import router as calendar_router
from server.routes.notes import router as notes_router
from server.routes.goals import router as goals_router
from server.routes.milestones import router as milestones_router
from server.routes.journal import router as journal_router
from server.routes.habits import router as habits_router
from server.routes.chat import router as chat_router
from server.routes.focus import router as focus_router
from server.routes.canvas import router as canvas_router
from server.routes.todos import router as todos_router
from server.routes.thoughts import router as thoughts_router
from server.routes.activity import router as activity_router
from server.routes.tags import router as tags_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev convenience; Alembic handles production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Productivity Hub", lifespan=lifespan)

# --- API routers (all prefixed under /api) ---
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(calendar_router, prefix="/api", tags=["calendar"])
app.include_router(notes_router, prefix="/api", tags=["notes"])
app.include_router(goals_router, prefix="/api", tags=["goals"])
app.include_router(milestones_router, prefix="/api", tags=["milestones"])
app.include_router(journal_router, prefix="/api", tags=["journal"])
app.include_router(habits_router, prefix="/api", tags=["habits"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(focus_router, prefix="/api", tags=["focus"])
app.include_router(canvas_router, prefix="/api", tags=["canvas"])
app.include_router(todos_router, prefix="/api", tags=["todos"])
app.include_router(thoughts_router, prefix="/api", tags=["thoughts"])
app.include_router(activity_router, prefix="/api", tags=["activity"])
app.include_router(tags_router, prefix="/api", tags=["tags"])

# --- SPA serving (production: Vite build output) ---
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "client", "dist")

if os.path.isdir(DIST_DIR):
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        """Serve index.html for client-side routing."""
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="0.0.0.0", port=5000, reload=True)
