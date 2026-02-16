from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user
from server.models.journal import JournalEntry

router = APIRouter(prefix="")


class JournalUpdate(BaseModel):
    morningIntentions: Optional[str] = None
    content: Optional[str] = None
    eveningReflection: Optional[str] = None


@router.get("/journal/recent")
async def get_recent_entries(
    limit: int = 7,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(JournalEntry)
        .where(JournalEntry.user_id == user.id)
        .order_by(JournalEntry.date.desc())
        .limit(limit)
    )
    return [e.to_dict() for e in result.scalars().all()]


@router.get("/journal/{date_str}")
async def get_entry(
    date_str: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    result = await db.execute(
        select(JournalEntry).where(
            JournalEntry.user_id == user.id, JournalEntry.date == d
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        entry = JournalEntry(user_id=user.id, date=d)
        db.add(entry)
        await db.flush()
        await db.refresh(entry)

    return entry.to_dict()


@router.put("/journal/{date_str}")
async def update_entry(
    date_str: str,
    body: JournalUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    result = await db.execute(
        select(JournalEntry).where(
            JournalEntry.user_id == user.id, JournalEntry.date == d
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        entry = JournalEntry(user_id=user.id, date=d)
        db.add(entry)

    if body.morningIntentions is not None:
        entry.morning_intentions = body.morningIntentions
    if body.content is not None:
        entry.content = body.content
    if body.eveningReflection is not None:
        entry.evening_reflection = body.eveningReflection

    await db.flush()
    await db.refresh(entry)
    return entry.to_dict()
