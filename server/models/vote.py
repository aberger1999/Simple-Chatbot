from datetime import datetime
from .base import db


class Vote(db.Model):
    __tablename__ = 'votes'

    id = db.Column(db.Integer, primary_key=True)
    target_type = db.Column(db.String(20), nullable=False)  # 'post' or 'comment'
    target_id = db.Column(db.Integer, nullable=False)
    value = db.Column(db.Integer, nullable=False)  # +1 or -1
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('target_type', 'target_id', name='uq_vote_target'),
    )
