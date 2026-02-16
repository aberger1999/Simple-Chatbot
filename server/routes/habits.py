import json
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user
from server.models.habit import HabitLog, CustomHabit, CustomHabitLog

router = APIRouter(prefix="")

VALID_CATEGORIES = ["sleep", "fitness", "finance", "diet_health"]


def _week_bounds(d):
    monday = d - timedelta(days=d.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


async def _preset_completed_on(db, user_id, category, d):
    result = await db.execute(
        select(HabitLog).where(
            HabitLog.user_id == user_id,
            HabitLog.date == d,
            HabitLog.category == category,
        )
    )
    log = result.scalar_one_or_none()
    return log.is_completed if log else False


async def _custom_completed_on(db, user_id, habit, d):
    result = await db.execute(
        select(CustomHabitLog).where(
            CustomHabitLog.user_id == user_id,
            CustomHabitLog.date == d,
            CustomHabitLog.custom_habit_id == habit.id,
        )
    )
    log = result.scalar_one_or_none()
    if not log or not log.value:
        return False
    if habit.tracking_type == "checkbox":
        return log.value == "true"
    try:
        return float(log.value) > 0
    except (ValueError, TypeError):
        return False


async def _calc_streak(db, user_id, check_fn, max_days=90):
    streak = 0
    today = date.today()
    for offset in range(max_days):
        check_date = today - timedelta(days=offset)
        if await check_fn(db, user_id, check_date):
            streak += 1
        else:
            break
    return streak


class CustomHabitCreate(BaseModel):
    name: str
    trackingType: Optional[str] = "checkbox"
    targetValue: Optional[float] = None
    unit: Optional[str] = None
    icon: Optional[str] = ""
    frequency: Optional[str] = "daily"


class CustomHabitUpdate(BaseModel):
    name: Optional[str] = None
    trackingType: Optional[str] = None
    targetValue: Optional[float] = None
    unit: Optional[str] = None
    frequency: Optional[str] = None
    isActive: Optional[bool] = None
    icon: Optional[str] = None
    position: Optional[int] = None


@router.get("/habits/week")
async def get_week(
    date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if date:
        try:
            from datetime import date as date_type
            d = date_type.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date")
    else:
        from datetime import date as date_type
        d = date_type.today()

    monday, sunday = _week_bounds(d)

    # Preset logs for the week
    result = await db.execute(
        select(HabitLog).where(
            HabitLog.user_id == user.id,
            HabitLog.date >= monday,
            HabitLog.date <= sunday,
        )
    )
    logs = result.scalars().all()

    logs_by_day = {}
    for log in logs:
        day_str = log.date.isoformat()
        if day_str not in logs_by_day:
            logs_by_day[day_str] = {}
        logs_by_day[day_str][log.category] = log.to_dict()

    # Custom habits
    result = await db.execute(
        select(CustomHabit).where(
            CustomHabit.user_id == user.id,
            CustomHabit.is_active == True,
        ).order_by(CustomHabit.position)
    )
    custom_habits = result.scalars().all()

    # Custom logs for the week
    result = await db.execute(
        select(CustomHabitLog).where(
            CustomHabitLog.user_id == user.id,
            CustomHabitLog.date >= monday,
            CustomHabitLog.date <= sunday,
        )
    )
    custom_logs_raw = result.scalars().all()

    custom_logs_by_day = {}
    for cl in custom_logs_raw:
        day_str = cl.date.isoformat()
        if day_str not in custom_logs_by_day:
            custom_logs_by_day[day_str] = {}
        custom_logs_by_day[day_str][str(cl.custom_habit_id)] = cl.to_dict()

    # Streaks
    streaks = {}
    for cat in VALID_CATEGORIES:
        streaks[cat] = await _calc_streak(
            db, user.id,
            lambda db, uid, d, c=cat: _preset_completed_on(db, uid, c, d),
        )
    for habit in custom_habits:
        streaks[f"custom_{habit.id}"] = await _calc_streak(
            db, user.id,
            lambda db, uid, d, h=habit: _custom_completed_on(db, uid, h, d),
        )

    return {
        "weekStart": monday.isoformat(),
        "weekEnd": sunday.isoformat(),
        "logs": logs_by_day,
        "customHabits": [h.to_dict() for h in custom_habits],
        "customLogs": custom_logs_by_day,
        "streaks": streaks,
    }


@router.put("/habits/log/{date_str}/{category}")
async def upsert_preset_log(
    date_str: str,
    category: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    try:
        from datetime import date as date_type
        d = date_type.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")

    result = await db.execute(
        select(HabitLog).where(
            HabitLog.user_id == user.id,
            HabitLog.date == d,
            HabitLog.category == category,
        )
    )
    log = result.scalar_one_or_none()

    if log:
        log.data = json.dumps(body)
        log.updated_at = datetime.now(timezone.utc)
    else:
        log = HabitLog(
            user_id=user.id,
            date=d,
            category=category,
            data=json.dumps(body),
        )
        db.add(log)

    await db.flush()
    await db.refresh(log)
    return log.to_dict()


@router.delete("/habits/log/{date_str}/{category}")
async def delete_preset_log(
    date_str: str,
    category: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    try:
        from datetime import date as date_type
        d = date_type.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")

    result = await db.execute(
        select(HabitLog).where(
            HabitLog.user_id == user.id,
            HabitLog.date == d,
            HabitLog.category == category,
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    await db.delete(log)
    await db.flush()
    return {"message": "Log deleted"}


@router.get("/habits/custom")
async def get_custom_habits(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(CustomHabit).where(
            CustomHabit.user_id == user.id,
            CustomHabit.is_active == True,
        ).order_by(CustomHabit.position)
    )
    return [h.to_dict() for h in result.scalars().all()]


@router.post("/habits/custom")
async def create_custom_habit(
    body: CustomHabitCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    max_pos_result = await db.execute(
        select(func.coalesce(func.max(CustomHabit.position), 0)).where(
            CustomHabit.user_id == user.id
        )
    )
    max_pos = max_pos_result.scalar()

    habit = CustomHabit(
        user_id=user.id,
        name=body.name,
        tracking_type=body.trackingType,
        target_value=body.targetValue,
        unit=body.unit,
        icon=body.icon,
        frequency=body.frequency,
        position=max_pos + 1,
    )
    db.add(habit)
    await db.flush()
    await db.refresh(habit)
    return JSONResponse(content=habit.to_dict(), status_code=201)


@router.put("/habits/custom/{id}")
async def update_custom_habit(
    id: int,
    body: CustomHabitUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(CustomHabit).where(CustomHabit.id == id, CustomHabit.user_id == user.id)
    )
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    if body.name is not None:
        habit.name = body.name
    if body.trackingType is not None:
        habit.tracking_type = body.trackingType
    if body.targetValue is not None:
        habit.target_value = body.targetValue
    if body.unit is not None:
        habit.unit = body.unit
    if body.frequency is not None:
        habit.frequency = body.frequency
    if body.isActive is not None:
        habit.is_active = body.isActive
    if body.icon is not None:
        habit.icon = body.icon
    if body.position is not None:
        habit.position = body.position

    await db.flush()
    await db.refresh(habit)
    return habit.to_dict()


@router.delete("/habits/custom/{id}")
async def delete_custom_habit(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(CustomHabit).where(CustomHabit.id == id, CustomHabit.user_id == user.id)
    )
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    await db.delete(habit)
    await db.flush()
    return {"message": "Habit deleted"}


@router.put("/habits/custom-log/{date_str}/{habit_id}")
async def upsert_custom_log(
    date_str: str,
    habit_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        from datetime import date as date_type
        d = date_type.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")

    result = await db.execute(
        select(CustomHabit).where(CustomHabit.id == habit_id, CustomHabit.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Habit not found")

    value = str(body.get("value", ""))

    result = await db.execute(
        select(CustomHabitLog).where(
            CustomHabitLog.user_id == user.id,
            CustomHabitLog.date == d,
            CustomHabitLog.custom_habit_id == habit_id,
        )
    )
    log = result.scalar_one_or_none()
    if log:
        log.value = value
    else:
        log = CustomHabitLog(
            user_id=user.id,
            date=d,
            custom_habit_id=habit_id,
            value=value,
        )
        db.add(log)

    await db.flush()
    await db.refresh(log)
    return log.to_dict()
