from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user
from server.models.goal import Goal, Milestone, SubMilestone

router = APIRouter(prefix="")


class MilestoneCreate(BaseModel):
    title: str


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    isCompleted: Optional[bool] = None
    position: Optional[int] = None


class SubMilestoneCreate(BaseModel):
    title: str


class SubMilestoneUpdate(BaseModel):
    title: Optional[str] = None
    isCompleted: Optional[bool] = None
    position: Optional[int] = None


def _recalculate_progress(goal):
    if goal.progress_mode != "milestones":
        return
    milestones = goal.milestones
    if not milestones:
        goal.progress = 0
    else:
        completed = sum(1 for m in milestones if m.is_completed)
        goal.progress = round((completed / len(milestones)) * 100)


# --- Milestones ---

@router.get("/goals/{goal_id}/milestones")
async def get_milestones(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Goal not found")

    result = await db.execute(
        select(Milestone)
        .where(Milestone.goal_id == goal_id, Milestone.user_id == user.id)
        .order_by(Milestone.position)
    )
    return [m.to_dict() for m in result.scalars().all()]


@router.post("/goals/{goal_id}/milestones")
async def create_milestone(
    goal_id: int,
    body: MilestoneCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    max_pos_result = await db.execute(
        select(func.max(Milestone.position)).where(Milestone.goal_id == goal_id)
    )
    max_pos = max_pos_result.scalar() or 0

    milestone = Milestone(
        user_id=user.id,
        goal_id=goal_id,
        title=body.title,
        position=max_pos + 1,
    )
    db.add(milestone)
    _recalculate_progress(goal)
    await db.flush()
    await db.refresh(milestone)
    await db.refresh(goal)
    return JSONResponse(
        content={**milestone.to_dict(), "goalProgress": goal.progress},
        status_code=201,
    )


@router.put("/milestones/{id}")
async def update_milestone(
    id: int,
    body: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Milestone).where(Milestone.id == id, Milestone.user_id == user.id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    if body.title is not None:
        milestone.title = body.title
    if body.isCompleted is not None:
        milestone.is_completed = body.isCompleted
    if body.position is not None:
        milestone.position = body.position

    goal_result = await db.execute(
        select(Goal).where(Goal.id == milestone.goal_id)
    )
    goal = goal_result.scalar_one_or_none()
    _recalculate_progress(goal)

    await db.flush()
    await db.refresh(milestone)
    await db.refresh(goal)
    return {**milestone.to_dict(), "goalProgress": goal.progress}


@router.delete("/milestones/{id}")
async def delete_milestone(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Milestone).where(Milestone.id == id, Milestone.user_id == user.id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    goal_result = await db.execute(
        select(Goal).where(Goal.id == milestone.goal_id)
    )
    goal = goal_result.scalar_one_or_none()

    await db.delete(milestone)
    await db.flush()
    _recalculate_progress(goal)
    await db.flush()
    await db.refresh(goal)
    return {"message": "Milestone deleted", "goalProgress": goal.progress}


# --- Sub-milestones ---

@router.post("/milestones/{milestone_id}/sub")
async def create_sub_milestone(
    milestone_id: int,
    body: SubMilestoneCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Milestone).where(Milestone.id == milestone_id, Milestone.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Milestone not found")

    max_pos_result = await db.execute(
        select(func.max(SubMilestone.position)).where(
            SubMilestone.milestone_id == milestone_id
        )
    )
    max_pos = max_pos_result.scalar() or 0

    sub = SubMilestone(
        milestone_id=milestone_id,
        title=body.title,
        position=max_pos + 1,
    )
    db.add(sub)
    await db.flush()
    await db.refresh(sub)
    return JSONResponse(content=sub.to_dict(), status_code=201)


@router.put("/sub-milestones/{id}")
async def update_sub_milestone(
    id: int,
    body: SubMilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(SubMilestone).where(SubMilestone.id == id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-milestone not found")

    if body.title is not None:
        sub.title = body.title
    if body.isCompleted is not None:
        sub.is_completed = body.isCompleted
    if body.position is not None:
        sub.position = body.position

    await db.flush()
    await db.refresh(sub)
    return sub.to_dict()


@router.delete("/sub-milestones/{id}")
async def delete_sub_milestone(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(SubMilestone).where(SubMilestone.id == id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-milestone not found")

    await db.delete(sub)
    await db.flush()
    return {"message": "Sub-milestone deleted"}
