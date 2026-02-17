from datetime import time
from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user
from server.models.notification_preference import NotificationPreference

router = APIRouter(prefix="")


class PreferencesUpdate(BaseModel):
    habitRemindersEnabled: Optional[bool] = None
    goalRemindersEnabled: Optional[bool] = None
    journalRemindersEnabled: Optional[bool] = None
    focusNotificationsEnabled: Optional[bool] = None
    weeklyReviewEnabled: Optional[bool] = None
    reminderTime: Optional[str] = None
    phoneNumber: Optional[str] = None


async def _get_or_create_prefs(
    db: AsyncSession, user_id: int
) -> NotificationPreference:
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.user_id == user_id
        )
    )
    prefs = result.scalar_one_or_none()
    if prefs is None:
        prefs = NotificationPreference(user_id=user_id)
        db.add(prefs)
        await db.flush()
        await db.refresh(prefs)
    return prefs


@router.get("/notifications/preferences")
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    prefs = await _get_or_create_prefs(db, user.id)
    return prefs.to_dict()


@router.put("/notifications/preferences")
async def update_preferences(
    body: PreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    prefs = await _get_or_create_prefs(db, user.id)

    if body.habitRemindersEnabled is not None:
        prefs.habit_reminders_enabled = body.habitRemindersEnabled
    if body.goalRemindersEnabled is not None:
        prefs.goal_reminders_enabled = body.goalRemindersEnabled
    if body.journalRemindersEnabled is not None:
        prefs.journal_reminders_enabled = body.journalRemindersEnabled
    if body.focusNotificationsEnabled is not None:
        prefs.focus_notifications_enabled = body.focusNotificationsEnabled
    if body.weeklyReviewEnabled is not None:
        prefs.weekly_review_enabled = body.weeklyReviewEnabled
    if body.reminderTime is not None:
        parts = body.reminderTime.split(":")
        prefs.reminder_time = time(int(parts[0]), int(parts[1]))
    if body.phoneNumber is not None:
        prefs.phone_number = body.phoneNumber or None

    await db.flush()
    await db.refresh(prefs)
    return prefs.to_dict()
