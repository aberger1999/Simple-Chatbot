from datetime import date, datetime, timedelta
from flask import Blueprint, jsonify
from server.models.base import db
from server.models.note import Note
from server.models.goal import Goal
from server.models.calendar_event import CalendarEvent
from server.models.journal_entry import JournalEntry
from server.models.habit_log import HabitLog
from server.models.custom_habit import CustomHabit
from server.models.custom_habit_log import CustomHabitLog
from server.models.blog_post import BlogPost
from server.models.focus_session import FocusSession

activity_bp = Blueprint('activity', __name__)

CATEGORY_LABELS = {
    'sleep': 'Sleep',
    'fitness': 'Fitness',
    'finance': 'Finance',
    'diet_health': 'Diet & Health',
}


def _week_bounds():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


@activity_bp.route('/api/activity-feed', methods=['GET'])
def get_activity_feed():
    monday, sunday = _week_bounds()
    mon_dt = datetime.combine(monday, datetime.min.time())
    sun_dt = datetime.combine(sunday, datetime.max.time())

    items = []

    # Notes created or updated this week
    notes = Note.query.filter(
        db.or_(
            db.and_(Note.created_at >= mon_dt, Note.created_at <= sun_dt),
            db.and_(Note.updated_at >= mon_dt, Note.updated_at <= sun_dt),
        )
    ).all()
    for n in notes:
        created_this_week = n.created_at and mon_dt <= n.created_at <= sun_dt
        updated_this_week = n.updated_at and mon_dt <= n.updated_at <= sun_dt
        if created_this_week:
            items.append({
                'type': 'note',
                'action': 'created',
                'description': f'Created note "{n.title}"',
                'timestamp': n.created_at.isoformat(),
            })
        if updated_this_week and n.updated_at != n.created_at:
            items.append({
                'type': 'note',
                'action': 'updated',
                'description': f'Edited note "{n.title}"',
                'timestamp': n.updated_at.isoformat(),
            })

    # Goals created or updated this week
    goals = Goal.query.filter(
        db.or_(
            db.and_(Goal.created_at >= mon_dt, Goal.created_at <= sun_dt),
            db.and_(Goal.updated_at >= mon_dt, Goal.updated_at <= sun_dt),
        )
    ).all()
    for g in goals:
        created_this_week = g.created_at and mon_dt <= g.created_at <= sun_dt
        updated_this_week = g.updated_at and mon_dt <= g.updated_at <= sun_dt
        if created_this_week:
            items.append({
                'type': 'goal',
                'action': 'created',
                'description': f'Created goal "{g.title}"',
                'timestamp': g.created_at.isoformat(),
            })
        if updated_this_week and g.updated_at != g.created_at:
            items.append({
                'type': 'goal',
                'action': 'updated',
                'description': f'Updated goal "{g.title}" ({g.progress}%)',
                'timestamp': g.updated_at.isoformat(),
            })

    # Calendar events created this week
    events = CalendarEvent.query.filter(
        CalendarEvent.created_at >= mon_dt,
        CalendarEvent.created_at <= sun_dt,
    ).all()
    for e in events:
        items.append({
            'type': 'event',
            'action': 'created',
            'description': f'Added event "{e.title}"',
            'timestamp': e.created_at.isoformat(),
        })

    # Journal entries written this week
    journals = JournalEntry.query.filter(
        JournalEntry.date >= monday,
        JournalEntry.date <= sunday,
    ).all()
    for j in journals:
        has_content = bool(j.morning_intentions or j.content or j.evening_reflection)
        if has_content:
            ts = j.updated_at or j.created_at
            items.append({
                'type': 'journal',
                'action': 'written',
                'description': f'Wrote journal for {j.date.strftime("%A, %b %d")}',
                'timestamp': ts.isoformat() if ts else j.date.isoformat(),
            })

    # Habit logs this week
    habit_logs = HabitLog.query.filter(
        HabitLog.date >= monday,
        HabitLog.date <= sunday,
    ).all()
    for h in habit_logs:
        if h.is_completed:
            label = CATEGORY_LABELS.get(h.category, h.category)
            ts = h.updated_at or h.created_at
            items.append({
                'type': 'habit',
                'action': 'logged',
                'description': f'Logged {label} habit for {h.date.strftime("%A")}',
                'timestamp': ts.isoformat() if ts else h.date.isoformat(),
            })

    # Custom habit logs this week
    custom_logs = CustomHabitLog.query.filter(
        CustomHabitLog.date >= monday,
        CustomHabitLog.date <= sunday,
    ).all()
    habit_cache = {}
    for cl in custom_logs:
        if not cl.value or cl.value == 'false':
            continue
        if cl.custom_habit_id not in habit_cache:
            habit = CustomHabit.query.get(cl.custom_habit_id)
            habit_cache[cl.custom_habit_id] = habit.name if habit else 'Custom habit'
        name = habit_cache[cl.custom_habit_id]
        items.append({
            'type': 'habit',
            'action': 'logged',
            'description': f'Logged "{name}" for {cl.date.strftime("%A")}',
            'timestamp': cl.created_at.isoformat() if cl.created_at else cl.date.isoformat(),
        })

    # Blog posts created or updated this week
    posts = BlogPost.query.filter(
        db.or_(
            db.and_(BlogPost.created_at >= mon_dt, BlogPost.created_at <= sun_dt),
            db.and_(BlogPost.updated_at >= mon_dt, BlogPost.updated_at <= sun_dt),
        )
    ).all()
    for p in posts:
        created_this_week = p.created_at and mon_dt <= p.created_at <= sun_dt
        updated_this_week = p.updated_at and mon_dt <= p.updated_at <= sun_dt
        if created_this_week:
            items.append({
                'type': 'blog',
                'action': 'created',
                'description': f'Published blog post "{p.title}"',
                'timestamp': p.created_at.isoformat(),
            })
        if updated_this_week and p.updated_at != p.created_at:
            items.append({
                'type': 'blog',
                'action': 'updated',
                'description': f'Updated blog post "{p.title}"',
                'timestamp': p.updated_at.isoformat(),
            })

    # Focus sessions this week
    focus_sessions = FocusSession.query.filter(
        FocusSession.created_at >= mon_dt,
        FocusSession.created_at <= sun_dt,
    ).all()
    for fs in focus_sessions:
        duration_min = (fs.actual_duration or 0) // 60
        title = fs.title or 'Untitled session'
        items.append({
            'type': 'focus',
            'action': fs.status,
            'description': f'Focus session: "{title}" ({duration_min}min, {fs.status})',
            'timestamp': fs.created_at.isoformat(),
        })

    # Sort by timestamp descending (most recent first)
    items.sort(key=lambda x: x['timestamp'], reverse=True)

    return jsonify(items)
