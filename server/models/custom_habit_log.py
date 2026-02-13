from datetime import datetime
from .base import db


class CustomHabitLog(db.Model):
    __tablename__ = 'custom_habit_logs'
    __table_args__ = (
        db.UniqueConstraint('date', 'custom_habit_id', name='uq_custom_habit_log_date_habit'),
    )

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    custom_habit_id = db.Column(db.Integer, db.ForeignKey('custom_habits.id'), nullable=False)
    value = db.Column(db.String(200), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    custom_habit = db.relationship('CustomHabit', back_populates='logs')

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'customHabitId': self.custom_habit_id,
            'value': self.value,
            'createdAt': self.created_at.isoformat(),
        }
