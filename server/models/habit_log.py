import json
from datetime import datetime
from .base import db

VALID_CATEGORIES = ('sleep', 'fitness', 'finance', 'diet_health')


class HabitLog(db.Model):
    __tablename__ = 'habit_logs'
    __table_args__ = (
        db.UniqueConstraint('date', 'category', name='uq_habit_log_date_category'),
    )

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    category = db.Column(db.String(20), nullable=False)
    data = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def parsed_data(self):
        try:
            return json.loads(self.data) if self.data else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    @property
    def is_completed(self):
        d = self.parsed_data
        if self.category == 'sleep':
            return bool(d.get('bedtime') and d.get('wakeTime'))
        elif self.category == 'fitness':
            return bool(d.get('activityType') and (d.get('duration') or 0) > 0)
        elif self.category == 'finance':
            return d.get('dailySpend') is not None and d.get('dailySpend') != ''
        elif self.category == 'diet_health':
            return (d.get('waterIntake') or 0) > 0 or bool(d.get('meals'))
        return False

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'category': self.category,
            'data': self.parsed_data,
            'isCompleted': self.is_completed,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
        }
