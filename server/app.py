import os
from flask import Flask, send_from_directory
from server.config import Config
from server.models.base import db


def create_app():
    # Determine if built React files exist
    client_dist = os.path.join(os.path.dirname(__file__), '..', 'client', 'dist')
    client_dist = os.path.abspath(client_dist)

    if os.path.isdir(client_dist):
        app = Flask(
            __name__,
            static_folder=client_dist,
            static_url_path='',
        )
    else:
        app = Flask(__name__)

    app.config.from_object(Config)

    # Ensure instance directory exists
    instance_dir = os.path.join(os.path.dirname(__file__), '..', 'instance')
    os.makedirs(instance_dir, exist_ok=True)

    # Initialize database
    db.init_app(app)

    # Import and register all models so tables are created
    from server.models.calendar_event import CalendarEvent  # noqa: F401
    from server.models.note import Note  # noqa: F401
    from server.models.goal import Goal  # noqa: F401
    from server.models.community import Community  # noqa: F401
    from server.models.thought_post import ThoughtPost  # noqa: F401
    from server.models.comment import Comment  # noqa: F401
    from server.models.vote import Vote  # noqa: F401
    from server.models.chat_message import ChatMessage  # noqa: F401
    from server.models.custom_tag import CustomTag  # noqa: F401
    from server.models.milestone import Milestone  # noqa: F401
    from server.models.sub_milestone import SubMilestone  # noqa: F401
    from server.models.journal_entry import JournalEntry  # noqa: F401
    from server.models.habit_log import HabitLog  # noqa: F401
    from server.models.custom_habit import CustomHabit  # noqa: F401
    from server.models.custom_habit_log import CustomHabitLog  # noqa: F401
    from server.models.focus_session import FocusSession  # noqa: F401
    from server.models.canvas_board import CanvasBoard  # noqa: F401
    from server.models.todo import TodoList, TodoItem  # noqa: F401

    with app.app_context():
        db.create_all()
        # Add color column to notes if it doesn't exist (SQLite migration)
        with db.engine.connect() as conn:
            columns = [row[1] for row in conn.execute(db.text("PRAGMA table_info(notes)"))]
            if 'color' not in columns:
                conn.execute(db.text("ALTER TABLE notes ADD COLUMN color VARCHAR(20) DEFAULT ''"))
                conn.commit()
            # Add progress_mode column to goals if it doesn't exist
            goal_columns = [row[1] for row in conn.execute(db.text("PRAGMA table_info(goals)"))]
            if 'progress_mode' not in goal_columns:
                conn.execute(db.text("ALTER TABLE goals ADD COLUMN progress_mode VARCHAR(20) DEFAULT 'manual'"))
                conn.commit()
            # Add icon column to custom_habits if it doesn't exist
            habit_columns = [row[1] for row in conn.execute(db.text("PRAGMA table_info(custom_habits)"))]
            if 'icon' not in habit_columns:
                conn.execute(db.text("ALTER TABLE custom_habits ADD COLUMN icon VARCHAR(50) DEFAULT ''"))
                conn.commit()
            # Drop legacy blog_posts table if it exists
            tables = [row[0] for row in conn.execute(db.text("SELECT name FROM sqlite_master WHERE type='table'"))]
            if 'blog_posts' in tables:
                conn.execute(db.text("DROP TABLE blog_posts"))
                conn.commit()

    # Register blueprints
    from server.routes.calendar import calendar_bp
    from server.routes.notes import notes_bp
    from server.routes.goals import goals_bp
    from server.routes.thoughts import thoughts_bp
    from server.routes.chat import chat_bp
    from server.routes.tags import tags_bp
    from server.routes.milestones import milestones_bp
    from server.routes.journal import journal_bp
    from server.routes.habits import habits_bp
    from server.routes.activity import activity_bp
    from server.routes.focus import focus_bp
    from server.routes.canvas import canvas_bp
    from server.routes.todos import todos_bp

    app.register_blueprint(calendar_bp)
    app.register_blueprint(notes_bp)
    app.register_blueprint(goals_bp)
    app.register_blueprint(thoughts_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(tags_bp)
    app.register_blueprint(milestones_bp)
    app.register_blueprint(journal_bp)
    app.register_blueprint(habits_bp)
    app.register_blueprint(activity_bp)
    app.register_blueprint(focus_bp)
    app.register_blueprint(canvas_bp)
    app.register_blueprint(todos_bp)

    # SPA catch-all: serve index.html for non-API routes
    if os.path.isdir(client_dist):
        @app.route('/')
        def serve_index():
            return send_from_directory(client_dist, 'index.html')

        @app.errorhandler(404)
        def spa_fallback(e):
            return send_from_directory(client_dist, 'index.html')

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
