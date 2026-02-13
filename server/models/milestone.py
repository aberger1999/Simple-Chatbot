from datetime import datetime
from .base import db


class Milestone(db.Model):
    __tablename__ = 'milestones'

    id = db.Column(db.Integer, primary_key=True)
    goal_id = db.Column(db.Integer, db.ForeignKey('goals.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    position = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sub_milestones = db.relationship(
        'SubMilestone',
        backref='milestone',
        cascade='all, delete-orphan',
        order_by='SubMilestone.position',
        lazy='joined',
    )

    def to_dict(self):
        return {
            'id': self.id,
            'goalId': self.goal_id,
            'title': self.title,
            'isCompleted': self.is_completed,
            'position': self.position,
            'subMilestones': [s.to_dict() for s in self.sub_milestones],
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
        }
