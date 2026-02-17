import json
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from server.models.base import Base


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    planned_duration: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_duration: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="completed")
    goal_ids: Mapped[str] = mapped_column(Text, default="[]")
    habit_ids: Mapped[str] = mapped_column(Text, default="[]")
    habit_categories: Mapped[str] = mapped_column(Text, default="[]")
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
            "title": self.title,
            "notes": self.notes,
            "plannedDuration": self.planned_duration,
            "actualDuration": self.actual_duration,
            "status": self.status,
            "goalIds": self._parse_json(self.goal_ids),
            "habitIds": self._parse_json(self.habit_ids),
            "habitCategories": self._parse_json(self.habit_categories),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
