import json
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from server.models.base import Base


class CanvasBoard(Base):
    __tablename__ = "canvas_boards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(
        String(200), default="Untitled Board", nullable=False
    )
    mode: Mapped[str] = mapped_column(String(20), default="flowchart", nullable=False)
    nodes: Mapped[str] = mapped_column(Text, default="[]")
    edges: Mapped[str] = mapped_column(Text, default="[]")
    viewport: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def _parse_json(self, value: str, default=None):
        if default is None:
            default = []
        try:
            return json.loads(value) if value else default
        except (json.JSONDecodeError, TypeError):
            return default

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "mode": self.mode,
            "nodes": self._parse_json(self.nodes, []),
            "edges": self._parse_json(self.edges, []),
            "viewport": self._parse_json(self.viewport, {}),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
