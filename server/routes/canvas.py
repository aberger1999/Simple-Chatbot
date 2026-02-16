import json
from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user
from server.models.canvas import CanvasBoard

router = APIRouter(prefix="")


class BoardCreate(BaseModel):
    name: Optional[str] = "Untitled Board"
    mode: Optional[str] = "flowchart"
    nodes: Optional[list] = []
    edges: Optional[list] = []
    viewport: Optional[dict] = {}


class BoardUpdate(BaseModel):
    name: Optional[str] = None
    mode: Optional[str] = None
    nodes: Optional[list] = None
    edges: Optional[list] = None
    viewport: Optional[dict] = None


@router.get("/canvas/boards")
async def get_boards(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(CanvasBoard)
        .where(CanvasBoard.user_id == user.id)
        .order_by(CanvasBoard.updated_at.desc())
    )
    return [
        {
            "id": b.id,
            "name": b.name,
            "mode": b.mode,
            "createdAt": b.created_at.isoformat() if b.created_at else None,
            "updatedAt": b.updated_at.isoformat() if b.updated_at else None,
        }
        for b in result.scalars().all()
    ]


@router.post("/canvas/boards")
async def create_board(
    body: BoardCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    board = CanvasBoard(
        user_id=user.id,
        name=body.name,
        mode=body.mode,
        nodes=json.dumps(body.nodes),
        edges=json.dumps(body.edges),
        viewport=json.dumps(body.viewport),
    )
    db.add(board)
    await db.flush()
    await db.refresh(board)
    return JSONResponse(content=board.to_dict(), status_code=201)


@router.get("/canvas/boards/{id}")
async def get_board(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(CanvasBoard).where(
            CanvasBoard.id == id, CanvasBoard.user_id == user.id
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board.to_dict()


@router.put("/canvas/boards/{id}")
async def update_board(
    id: int,
    body: BoardUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(CanvasBoard).where(
            CanvasBoard.id == id, CanvasBoard.user_id == user.id
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    if body.name is not None:
        board.name = body.name
    if body.mode is not None:
        board.mode = body.mode
    if body.nodes is not None:
        board.nodes = json.dumps(body.nodes)
    if body.edges is not None:
        board.edges = json.dumps(body.edges)
    if body.viewport is not None:
        board.viewport = json.dumps(body.viewport)

    await db.flush()
    await db.refresh(board)
    return board.to_dict()


@router.delete("/canvas/boards/{id}")
async def delete_board(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(CanvasBoard).where(
            CanvasBoard.id == id, CanvasBoard.user_id == user.id
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    await db.delete(board)
    await db.flush()
    return {"message": "Board deleted"}
