import json
from datetime import datetime
from .base import db


class CanvasBoard(db.Model):
    __tablename__ = 'canvas_boards'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, default='Untitled Board')
    mode = db.Column(db.String(20), nullable=False, default='flowchart')
    nodes = db.Column(db.Text, default='[]')
    edges = db.Column(db.Text, default='[]')
    viewport = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def _parse_json(self, field, fallback):
        try:
            return json.loads(field) if field else fallback
        except (json.JSONDecodeError, TypeError):
            return fallback

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'mode': self.mode,
            'nodes': self._parse_json(self.nodes, []),
            'edges': self._parse_json(self.edges, []),
            'viewport': self._parse_json(self.viewport, {}),
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
