from datetime import datetime
from .base import db


class CalendarEvent(db.Model):
    __tablename__ = 'calendar_events'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    start = db.Column(db.DateTime, nullable=False)
    end = db.Column(db.DateTime, nullable=False)
    all_day = db.Column(db.Boolean, default=False)
    color = db.Column(db.String(20), default='#3b82f6')
    category = db.Column(db.String(50), default='')
    recurrence = db.Column(db.Text, default='')
    goal_id = db.Column(db.Integer, db.ForeignKey('goals.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    goal = db.relationship('Goal', back_populates='events')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'start': self.start.isoformat(),
            'end': self.end.isoformat(),
            'allDay': self.all_day,
            'color': self.color,
            'category': self.category,
            'recurrence': self.recurrence,
            'goalId': self.goal_id,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
        }
