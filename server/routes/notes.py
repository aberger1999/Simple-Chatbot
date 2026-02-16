from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user
from server.models.note import Note

router = APIRouter(prefix="")


class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = ""
    tags: Optional[str] = ""
    isPinned: Optional[bool] = False
    color: Optional[str] = ""
    goalId: Optional[int] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[str] = None
    isPinned: Optional[bool] = None
    color: Optional[str] = None
    goalId: Optional[int] = None


@router.get("/notes")
async def get_notes(
    search: Optional[str] = None,
    tag: Optional[str] = None,
    goal_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    query = select(Note).where(Note.user_id == user.id)

    if search:
        query = query.where(
            or_(
                Note.title.ilike(f"%{search}%"),
                Note.content.ilike(f"%{search}%"),
                Note.tags.ilike(f"%{search}%"),
            )
        )
    if tag:
        query = query.where(Note.tags.ilike(f"%{tag}%"))
    if goal_id:
        query = query.where(Note.goal_id == goal_id)

    query = query.order_by(Note.is_pinned.desc(), Note.updated_at.desc())
    result = await db.execute(query)
    return [n.to_dict() for n in result.scalars().all()]


@router.post("/notes")
async def create_note(
    body: NoteCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    raw_tags = body.tags or ""
    normalized_tags = ",".join(t.strip().lower() for t in raw_tags.split(",") if t.strip())
    note = Note(
        user_id=user.id,
        title=body.title,
        content=body.content,
        tags=normalized_tags,
        is_pinned=body.isPinned,
        color=body.color,
        goal_id=body.goalId,
    )
    db.add(note)
    await db.flush()
    await db.refresh(note)
    return JSONResponse(content=note.to_dict(), status_code=201)


@router.get("/notes/{id}")
async def get_note(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(Note.id == id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note.to_dict()


@router.put("/notes/{id}")
async def update_note(
    id: int,
    body: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(Note.id == id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if body.title is not None:
        note.title = body.title
    if body.content is not None:
        note.content = body.content
    if body.tags is not None:
        note.tags = ",".join(t.strip().lower() for t in body.tags.split(",") if t.strip())
    if body.isPinned is not None:
        note.is_pinned = body.isPinned
    if body.color is not None:
        note.color = body.color
    if body.goalId is not None:
        note.goal_id = body.goalId

    await db.flush()
    await db.refresh(note)
    return note.to_dict()


@router.delete("/notes/{id}")
async def delete_note(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(Note.id == id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    await db.delete(note)
    await db.flush()
    return {"message": "Note deleted"}
