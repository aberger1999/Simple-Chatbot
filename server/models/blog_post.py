from datetime import datetime
from .base import db


class BlogPost(db.Model):
    __tablename__ = 'blog_posts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, default='')
    summary = db.Column(db.String(500), default='')
    cover_image = db.Column(db.String(500), default='')
    tags = db.Column(db.String(500), default='')
    goal_id = db.Column(db.Integer, db.ForeignKey('goals.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    goal = db.relationship('Goal', back_populates='blog_posts')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'summary': self.summary,
            'coverImage': self.cover_image,
            'tags': self.tags,
            'goalId': self.goal_id,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
        }
