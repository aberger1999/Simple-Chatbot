import json
from datetime import datetime
from .base import db


class FocusSession(db.Model):
    __tablename__ = 'focus_sessions'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), default='')
    notes = db.Column(db.Text, default='')
    planned_duration = db.Column(db.Integer, nullable=False)
    actual_duration = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='completed')
    goal_ids = db.Column(db.Text, default='[]')
    habit_ids = db.Column(db.Text, default='[]')
    habit_categories = db.Column(db.Text, default='[]')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def _parse_json(self, field):
        try:
            return json.loads(field) if field else []
        except (json.JSONDecodeError, TypeError):
            return []

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title or '',
            'notes': self.notes or '',
            'plannedDuration': self.planned_duration,
            'actualDuration': self.actual_duration,
            'status': self.status,
            'goalIds': self._parse_json(self.goal_ids),
            'habitIds': self._parse_json(self.habit_ids),
            'habitCategories': self._parse_json(self.habit_categories),
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
