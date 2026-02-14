from datetime import datetime
from .base import db


class TodoList(db.Model):
    __tablename__ = 'todo_lists'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    position = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship(
        'TodoItem',
        backref='list',
        cascade='all, delete-orphan',
        order_by='TodoItem.position',
        lazy='joined',
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'position': self.position,
            'itemCount': len([i for i in self.items if not i.completed]),
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }


class TodoItem(db.Model):
    __tablename__ = 'todo_items'

    id = db.Column(db.Integer, primary_key=True)
    list_id = db.Column(db.Integer, db.ForeignKey('todo_lists.id'), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    position = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'listId': self.list_id,
            'text': self.text,
            'completed': self.completed,
            'position': self.position,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
