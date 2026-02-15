from datetime import datetime
from .base import db


class ThoughtPost(db.Model):
    __tablename__ = 'thought_posts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    body = db.Column(db.Text, default='')
    tags = db.Column(db.String(500), default='')
    community_id = db.Column(db.Integer, db.ForeignKey('communities.id'), nullable=False)
    goal_id = db.Column(db.Integer, db.ForeignKey('goals.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    community = db.relationship('Community', back_populates='posts')
    goal = db.relationship('Goal', back_populates='thought_posts')
    comments = db.relationship('Comment', back_populates='post', cascade='all, delete-orphan')
    votes = db.relationship(
        'Vote',
        primaryjoin="and_(Vote.target_type=='post', foreign(Vote.target_id)==ThoughtPost.id)",
        viewonly=True,
    )

    def vote_score(self):
        from .vote import Vote
        result = db.session.query(db.func.coalesce(db.func.sum(Vote.value), 0)).filter(
            Vote.target_type == 'post', Vote.target_id == self.id
        ).scalar()
        return result

    def comment_count(self):
        return len(self.comments)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'body': self.body,
            'tags': self.tags,
            'communityId': self.community_id,
            'communityName': self.community.name if self.community else None,
            'goalId': self.goal_id,
            'voteScore': self.vote_score(),
            'commentCount': self.comment_count(),
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
        }
