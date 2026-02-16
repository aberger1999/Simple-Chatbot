from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user
from server.models.goal import Goal
from server.models.note import Note
from server.models.thought import ThoughtPost
from server.models.calendar_event import CalendarEvent

router = APIRouter(prefix="")


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "active"
    targetDate: Optional[str] = None
    progress: Optional[int] = 0
    progressMode: Optional[str] = "manual"
    color: Optional[str] = "#8b5cf6"


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    targetDate: Optional[str] = None
    progress: Optional[int] = None
    progressMode: Optional[str] = None
    color: Optional[str] = None


@router.get("/goals")
async def get_goals(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Goal)
        .where(Goal.user_id == user.id)
        .order_by(Goal.created_at.desc())
    )
    return [g.to_dict() for g in result.scalars().all()]


@router.post("/goals")
async def create_goal(
    body: GoalCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    goal = Goal(
        user_id=user.id,
        title=body.title,
        description=body.description,
        status=body.status,
        target_date=datetime.fromisoformat(body.targetDate) if body.targetDate else None,
        progress=body.progress,
        progress_mode=body.progressMode,
        color=body.color,
    )
    db.add(goal)
    await db.flush()
    await db.refresh(goal)
    return JSONResponse(content=goal.to_dict(), status_code=201)


@router.get("/goals/{id}")
async def get_goal(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == id, Goal.user_id == user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    data = goal.to_dict()

    # Related notes
    notes_result = await db.execute(
        select(Note).where(Note.goal_id == id, Note.user_id == user.id)
    )
    data["notes"] = [n.to_dict() for n in notes_result.scalars().all()]

    # Related thought posts
    posts_result = await db.execute(
        select(ThoughtPost).where(ThoughtPost.goal_id == id, ThoughtPost.user_id == user.id)
    )
    data["thoughtPosts"] = [p.to_dict() for p in posts_result.scalars().all()]

    # Related events
    events_result = await db.execute(
        select(CalendarEvent).where(CalendarEvent.goal_id == id, CalendarEvent.user_id == user.id)
    )
    data["events"] = [e.to_dict() for e in events_result.scalars().all()]

    return data


@router.put("/goals/{id}")
async def update_goal(
    id: int,
    body: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == id, Goal.user_id == user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if body.title is not None:
        goal.title = body.title
    if body.description is not None:
        goal.description = body.description
    if body.status is not None:
        goal.status = body.status
    if body.targetDate is not None:
        goal.target_date = datetime.fromisoformat(body.targetDate) if body.targetDate else None
    if body.progress is not None:
        goal.progress = body.progress
    if body.progressMode is not None:
        goal.progress_mode = body.progressMode
        if body.progressMode == "milestones":
            milestones = goal.milestones
            if milestones:
                completed = sum(1 for m in milestones if m.is_completed)
                goal.progress = round((completed / len(milestones)) * 100)
            else:
                goal.progress = 0
    if body.color is not None:
        goal.color = body.color

    await db.flush()
    await db.refresh(goal)
    return goal.to_dict()


@router.delete("/goals/{id}")
async def delete_goal(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == id, Goal.user_id == user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    await db.delete(goal)
    await db.flush()
    return {"message": "Goal deleted"}
