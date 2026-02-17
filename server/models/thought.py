from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from server.models.base import Base


class Community(Base):
    __tablename__ = "communities"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_community_user_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    posts: Mapped[list["ThoughtPost"]] = relationship(
        "ThoughtPost",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        try:
            post_count = len(self.posts)
        except Exception:
            post_count = 0
        return {
            "id": self.id,
            "name": self.name,
            "postCount": post_count,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "target_type", "target_id", name="uq_vote_user_target"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_id: Mapped[int] = mapped_column(Integer, nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class ThoughtPost(Base):
    __tablename__ = "thought_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[str] = mapped_column(String(500), default="")
    community_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("communities.id"), nullable=False
    )
    goal_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("goals.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    community: Mapped["Community"] = relationship("Community", viewonly=True)
    comments: Mapped[list["Comment"]] = relationship(
        "Comment",
        cascade="all, delete-orphan",
    )
    votes: Mapped[list["Vote"]] = relationship(
        "Vote",
        primaryjoin="and_(ThoughtPost.id == foreign(Vote.target_id), Vote.target_type == 'post')",
        viewonly=True,
    )

    @property
    def vote_score(self) -> int:
        try:
            return sum(v.value for v in self.votes)
        except Exception:
            return 0

    @property
    def comment_count(self) -> int:
        try:
            return len(self.comments)
        except Exception:
            return 0

    def to_dict(self):
        try:
            community_name = self.community.name if self.community else ""
        except Exception:
            community_name = ""
        return {
            "id": self.id,
            "title": self.title,
            "body": self.body,
            "tags": self.tags,
            "communityId": self.community_id,
            "communityName": community_name,
            "goalId": self.goal_id,
            "voteScore": self.vote_score,
            "commentCount": self.comment_count,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    post_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("thought_posts.id"), nullable=False
    )
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("comments.id"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    replies: Mapped[list["Comment"]] = relationship(
        "Comment",
        back_populates="parent",
    )
    parent: Mapped["Comment | None"] = relationship(
        "Comment",
        back_populates="replies",
        remote_side=[id],
    )
    post: Mapped["ThoughtPost"] = relationship(
        "ThoughtPost",
        viewonly=True,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "postId": self.post_id,
            "parentId": self.parent_id,
            "body": self.body,
            "voteScore": 0,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
