from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user
from server.models.tag import CustomTag
from server.models.note import Note
from server.models.thought import ThoughtPost

router = APIRouter(prefix="")

PRESET_TAGS = [
    "work", "personal", "ideas", "finance", "health", "travel",
    "recipes", "projects", "learning", "shopping", "journal",
    "meeting", "important", "reference",
]


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str


@router.get("/tags")
async def get_tags(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(CustomTag)
        .where(CustomTag.user_id == user.id)
        .order_by(CustomTag.name)
    )
    return {
        "presetTags": PRESET_TAGS,
        "customTags": [t.to_dict() for t in result.scalars().all()],
    }


@router.post("/tags")
async def create_tag(
    body: TagCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    name = body.name.strip().lower()

    if not name:
        raise HTTPException(status_code=400, detail="Tag name is required")
    if "," in name:
        raise HTTPException(status_code=400, detail="Tag name cannot contain commas")
    if name in PRESET_TAGS:
        raise HTTPException(status_code=400, detail="This is already a preset tag")

    result = await db.execute(
        select(CustomTag).where(CustomTag.user_id == user.id, CustomTag.name == name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This custom tag already exists")

    tag = CustomTag(user_id=user.id, name=name)
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return JSONResponse(content=tag.to_dict(), status_code=201)


async def _propagate_tag_rename(db, user_id, old_name, new_name):
    for Model in (Note, ThoughtPost):
        result = await db.execute(
            select(Model).where(
                Model.user_id == user_id,
                Model.tags.ilike(f"%{old_name}%"),
            )
        )
        for item in result.scalars().all():
            tags = [t.strip() for t in item.tags.split(",") if t.strip()]
            tags = [new_name if t == old_name else t for t in tags]
            item.tags = ",".join(tags)


async def _remove_tag_from_items(db, user_id, tag_name):
    for Model in (Note, ThoughtPost):
        result = await db.execute(
            select(Model).where(
                Model.user_id == user_id,
                Model.tags.ilike(f"%{tag_name}%"),
            )
        )
        for item in result.scalars().all():
            tags = [t.strip() for t in item.tags.split(",") if t.strip()]
            tags = [t for t in tags if t != tag_name]
            item.tags = ",".join(tags)


@router.put("/tags/{id}")
async def update_tag(
    id: int,
    body: TagUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(CustomTag).where(CustomTag.id == id, CustomTag.user_id == user.id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    new_name = body.name.strip().lower()

    if not new_name:
        raise HTTPException(status_code=400, detail="Tag name is required")
    if "," in new_name:
        raise HTTPException(status_code=400, detail="Tag name cannot contain commas")
    if new_name in PRESET_TAGS:
        raise HTTPException(status_code=400, detail="Cannot rename to a preset tag name")

    existing = await db.execute(
        select(CustomTag).where(CustomTag.user_id == user.id, CustomTag.name == new_name)
    )
    existing_tag = existing.scalar_one_or_none()
    if existing_tag and existing_tag.id != tag.id:
        raise HTTPException(status_code=400, detail="A custom tag with this name already exists")

    old_name = tag.name
    await _propagate_tag_rename(db, user.id, old_name, new_name)
    tag.name = new_name

    await db.flush()
    await db.refresh(tag)
    return tag.to_dict()


@router.delete("/tags/{id}")
async def delete_tag(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(CustomTag).where(CustomTag.id == id, CustomTag.user_id == user.id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    await _remove_tag_from_items(db, user.id, tag.name)
    await db.delete(tag)
    await db.flush()
    return {"message": "Tag deleted"}
