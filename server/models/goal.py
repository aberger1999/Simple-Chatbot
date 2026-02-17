from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from server.models.base import Base


class SubMilestone(Base):
    __tablename__ = "sub_milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    milestone_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("milestones.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
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
            "milestoneId": self.milestone_id,
            "title": self.title,
            "isCompleted": self.is_completed,
            "position": self.position,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    goal_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("goals.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    sub_milestones: Mapped[list["SubMilestone"]] = relationship(
        "SubMilestone",
        lazy="selectin",
        order_by="SubMilestone.position",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "goalId": self.goal_id,
            "title": self.title,
            "isCompleted": self.is_completed,
            "position": self.position,
            "subMilestones": [sm.to_dict() for sm in self.sub_milestones],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="active")
    target_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    progress_mode: Mapped[str] = mapped_column(String(20), default="manual")
    color: Mapped[str] = mapped_column(String(20), default="#8b5cf6")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    milestones: Mapped[list["Milestone"]] = relationship(
        "Milestone",
        lazy="selectin",
        order_by="Milestone.position",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "targetDate": self.target_date.isoformat() if self.target_date else None,
            "progress": self.progress,
            "progressMode": self.progress_mode,
            "color": self.color,
            "milestones": [m.to_dict() for m in self.milestones],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
