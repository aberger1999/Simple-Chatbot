from datetime import datetime
from .base import db


class Goal(db.Model):
    __tablename__ = 'goals'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    status = db.Column(db.String(20), default='active')  # active, completed, paused
    target_date = db.Column(db.DateTime, nullable=True)
    progress = db.Column(db.Integer, default=0)  # 0-100
    progress_mode = db.Column(db.String(20), default='manual')  # manual or milestones
    color = db.Column(db.String(20), default='#8b5cf6')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    notes = db.relationship('Note', back_populates='goal', lazy='dynamic')
    blog_posts = db.relationship('BlogPost', back_populates='goal', lazy='dynamic')
    events = db.relationship('CalendarEvent', back_populates='goal', lazy='dynamic')
    milestones = db.relationship(
        'Milestone',
        backref='goal',
        cascade='all, delete-orphan',
        order_by='Milestone.position',
        lazy='joined',
    )

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'targetDate': self.target_date.isoformat() if self.target_date else None,
            'progress': self.progress,
            'progressMode': self.progress_mode,
            'color': self.color,
            'milestones': [m.to_dict() for m in self.milestones],
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
        }
