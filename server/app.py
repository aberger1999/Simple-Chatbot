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
    from server.models.blog_post import BlogPost  # noqa: F401
    from server.models.chat_message import ChatMessage  # noqa: F401
    from server.models.custom_tag import CustomTag  # noqa: F401

    with app.app_context():
        db.create_all()

    # Register blueprints
    from server.routes.calendar import calendar_bp
    from server.routes.notes import notes_bp
    from server.routes.goals import goals_bp
    from server.routes.blog import blog_bp
    from server.routes.chat import chat_bp
    from server.routes.tags import tags_bp

    app.register_blueprint(calendar_bp)
    app.register_blueprint(notes_bp)
    app.register_blueprint(goals_bp)
    app.register_blueprint(blog_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(tags_bp)

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
