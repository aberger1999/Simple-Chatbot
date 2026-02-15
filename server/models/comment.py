from datetime import datetime
from .base import db


class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('thought_posts.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=True)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    post = db.relationship('ThoughtPost', back_populates='comments')
    parent = db.relationship('Comment', remote_side=[id], backref='replies')

    def vote_score(self):
        from .vote import Vote
        result = db.session.query(db.func.coalesce(db.func.sum(Vote.value), 0)).filter(
            Vote.target_type == 'comment', Vote.target_id == self.id
        ).scalar()
        return result

    def to_dict(self):
        return {
            'id': self.id,
            'postId': self.post_id,
            'parentId': self.parent_id,
            'body': self.body,
            'voteScore': self.vote_score(),
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
        }
