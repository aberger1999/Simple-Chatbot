import logging
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.config import settings
from server.database import get_db
from server.auth import hash_password, verify_password, create_access_token, create_reset_token, verify_reset_token
from server.models.user import User
from server.services.novu_service import trigger_password_reset

logger = logging.getLogger(__name__)

router = APIRouter(prefix="")


class RegisterBody(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordBody(BaseModel):
    email: EmailStr


class ResetPasswordBody(BaseModel):
    token: str
    password: str


@router.post("/register")
async def register(body: RegisterBody, db: AsyncSession = Depends(get_db)):
    # Check if email is already taken
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token(user.id)
    return {"token": token, "user": user.to_dict()}


@router.post("/login")
async def login(body: LoginBody, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id)
    return {"token": token, "user": user.to_dict()}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordBody, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user:
        token = create_reset_token(user.id, user.password_hash)
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{token}"
        logger.info("Password reset link for %s: %s", user.email, reset_link)
        try:
            await trigger_password_reset(user.email, user.name, reset_link)
        except Exception:
            logger.exception("Failed to send password reset email via Novu")

    return {"message": "If an account exists with that email, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordBody, db: AsyncSession = Depends(get_db)):
    claims = verify_reset_token(body.token)
    if not claims:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")

    result = await db.execute(select(User).where(User.id == claims["user_id"]))
    user = result.scalar_one_or_none()
    if not user or user.password_hash[:10] != claims["fingerprint"]:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")

    user.password_hash = hash_password(body.password)
    await db.flush()
    return {"message": "Password reset successfully."}
