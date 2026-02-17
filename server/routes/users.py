from typing import Optional

from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user, verify_password, hash_password
from server.models.user import User

router = APIRouter(prefix="")


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    timezone: Optional[str] = None
    phoneNumber: Optional[str] = None


class ChangePassword(BaseModel):
    currentPassword: str
    newPassword: str


@router.get("/users/profile")
async def get_profile(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return user.to_dict()


@router.put("/users/profile")
async def update_profile(
    body: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        user.name = body.name.strip()

    if body.email is not None:
        if body.email != user.email:
            existing = await db.execute(
                select(User).where(User.email == body.email, User.id != user.id)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="Email already in use")
            user.email = body.email

    if body.timezone is not None:
        user.timezone = body.timezone or None

    await db.flush()
    await db.refresh(user)
    return user.to_dict()


@router.post("/users/change-password")
async def change_password(
    body: ChangePassword,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if not verify_password(body.currentPassword, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(body.newPassword) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user.password_hash = hash_password(body.newPassword)
    await db.flush()
    return {"message": "Password updated successfully"}
