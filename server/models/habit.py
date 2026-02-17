import datetime as dt
import json
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from server.models.base import Base


class HabitLog(Base):
    __tablename__ = "habit_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "date", "category", name="uq_habit_user_date_cat"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    data: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    @property
    def parsed_data(self) -> dict:
        try:
            return json.loads(self.data) if self.data else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    @property
    def is_completed(self) -> bool:
        d = self.parsed_data
        if self.category == "sleep":
            return bool(d.get("hours"))
        elif self.category == "fitness":
            return bool(d.get("duration"))
        elif self.category == "finance":
            return bool(d.get("dailySpend"))
        elif self.category == "diet_health":
            return bool(d.get("waterIntake"))
        return False

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat() if self.date else None,
            "category": self.category,
            "data": self.parsed_data,
            "isCompleted": self.is_completed,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class CustomHabit(Base):
    __tablename__ = "custom_habits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    tracking_type: Mapped[str] = mapped_column(String(20), default="checkbox")
    target_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    frequency: Mapped[str] = mapped_column(String(10), default="daily")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    icon: Mapped[str] = mapped_column(String(50), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "icon": self.icon,
            "trackingType": self.tracking_type,
            "targetValue": self.target_value,
            "unit": self.unit,
            "frequency": self.frequency,
            "isActive": self.is_active,
            "position": self.position,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class CustomHabitLog(Base):
    __tablename__ = "custom_habit_logs"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "date", "custom_habit_id", name="uq_custom_habit_log"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False, index=True)
    custom_habit_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("custom_habits.id"), nullable=False
    )
    value: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat() if self.date else None,
            "customHabitId": self.custom_habit_id,
            "value": self.value,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
