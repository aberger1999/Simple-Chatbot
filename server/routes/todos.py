from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user
from server.models.todo import TodoList, TodoItem

router = APIRouter(prefix="")


class ListCreate(BaseModel):
    name: str


class ListUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None


class ItemCreate(BaseModel):
    text: str


class ItemUpdate(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None
    position: Optional[int] = None
    listId: Optional[int] = None


# --- Lists ---

@router.get("/todos/lists")
async def get_lists(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(TodoList)
        .where(TodoList.user_id == user.id)
        .order_by(TodoList.position, TodoList.id)
    )
    return [l.to_dict() for l in result.scalars().all()]


@router.post("/todos/lists")
async def create_list(
    body: ListCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    max_pos_result = await db.execute(
        select(func.coalesce(func.max(TodoList.position), -1)).where(
            TodoList.user_id == user.id
        )
    )
    max_pos = max_pos_result.scalar()

    lst = TodoList(
        user_id=user.id,
        name=body.name,
        position=max_pos + 1,
    )
    db.add(lst)
    await db.flush()
    await db.refresh(lst)
    return JSONResponse(content=lst.to_dict(), status_code=201)


@router.put("/todos/lists/{id}")
async def update_list(
    id: int,
    body: ListUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(TodoList).where(TodoList.id == id, TodoList.user_id == user.id)
    )
    lst = result.scalar_one_or_none()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    if body.name is not None:
        lst.name = body.name
    if body.position is not None:
        lst.position = body.position

    await db.flush()
    await db.refresh(lst)
    return lst.to_dict()


@router.delete("/todos/lists/{id}")
async def delete_list(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(TodoList).where(TodoList.id == id, TodoList.user_id == user.id)
    )
    lst = result.scalar_one_or_none()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    await db.delete(lst)
    await db.flush()
    return {"message": "List deleted"}


# --- Items ---

@router.get("/todos/lists/{list_id}/items")
async def get_items(
    list_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(TodoList).where(TodoList.id == list_id, TodoList.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="List not found")

    result = await db.execute(
        select(TodoItem)
        .where(TodoItem.list_id == list_id)
        .order_by(TodoItem.position)
    )
    return [i.to_dict() for i in result.scalars().all()]


@router.post("/todos/lists/{list_id}/items")
async def create_item(
    list_id: int,
    body: ItemCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(TodoList).where(TodoList.id == list_id, TodoList.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="List not found")

    max_pos_result = await db.execute(
        select(func.coalesce(func.max(TodoItem.position), -1)).where(
            TodoItem.list_id == list_id
        )
    )
    max_pos = max_pos_result.scalar()

    item = TodoItem(
        list_id=list_id,
        text=body.text,
        position=max_pos + 1,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return JSONResponse(content=item.to_dict(), status_code=201)


@router.put("/todos/items/{id}")
async def update_item(
    id: int,
    body: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(TodoItem).where(TodoItem.id == id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if body.text is not None:
        item.text = body.text
    if body.completed is not None:
        item.completed = body.completed
    if body.position is not None:
        item.position = body.position
    if body.listId is not None:
        item.list_id = body.listId

    await db.flush()
    await db.refresh(item)
    return item.to_dict()


@router.delete("/todos/items/{id}")
async def delete_item(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(TodoItem).where(TodoItem.id == id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    await db.delete(item)
    await db.flush()
    return {"message": "Item deleted"}
