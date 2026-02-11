from datetime import datetime
from .base import db


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), nullable=False)  # user, assistant
    content = db.Column(db.Text, nullable=False)
    mode = db.Column(db.String(20), default='ollama')  # ollama, legacy
    session_id = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'mode': self.mode,
            'sessionId': self.session_id,
            'createdAt': self.created_at.isoformat(),
        }
