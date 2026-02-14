from datetime import datetime
from .base import db


class CustomHabit(db.Model):
    __tablename__ = 'custom_habits'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    tracking_type = db.Column(db.String(20), nullable=False, default='checkbox')
    target_value = db.Column(db.Float, nullable=True)
    unit = db.Column(db.String(50), nullable=True)
    frequency = db.Column(db.String(10), default='daily')
    is_active = db.Column(db.Boolean, default=True)
    icon = db.Column(db.String(50), nullable=True, default='')
    position = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    logs = db.relationship('CustomHabitLog', back_populates='custom_habit', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'icon': self.icon or '',
            'trackingType': self.tracking_type,
            'targetValue': self.target_value,
            'unit': self.unit,
            'frequency': self.frequency,
            'isActive': self.is_active,
            'position': self.position,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
        }
