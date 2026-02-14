import re
from datetime import datetime, timedelta
from server.models.calendar_event import CalendarEvent
from server.models.goal import Goal
from server.models.note import Note
from server.models.journal_entry import JournalEntry
from server.models.habit_log import HabitLog
from server.models.custom_habit import CustomHabit
from server.models.custom_habit_log import CustomHabitLog


def _strip_html(text):
    if not text:
        return ''
    return re.sub(r'<[^>]+>', '', text).strip()


def build_context():
    now = datetime.utcnow()
    today = now.date()
    week_ahead = now + timedelta(days=7)

    parts = [
        'You are a personal productivity assistant embedded in the user\'s productivity hub. '
        'You have access to their goals, journal entries, habits, calendar, and notes. '
        'Use this data naturally to give relevant, thoughtful responses — reference specifics '
        'when helpful, offer encouragement, suggest connections between their goals and activities, '
        'and help them stay on track. Never just dump their data back at them. '
        'Be warm, concise, and practical. Today is '
        + now.strftime('%A, %B %d, %Y') + '.'
    ]

    # Active goals
    goals = Goal.query.filter_by(status='active').all()
    if goals:
        parts.append('\n[Active Goals]')
        for g in goals:
            line = f'- {g.title} ({g.progress}% complete)'
            if g.target_date:
                parts.append(f'{line} — target: {g.target_date}')
            else:
                parts.append(line)

    # Last 5 journal entries
    journals = JournalEntry.query.order_by(
        JournalEntry.date.desc()
    ).limit(5).all()
    if journals:
        has_content = [j for j in journals if j.morning_intentions or j.content or j.evening_reflection]
        if has_content:
            parts.append('\n[Recent Journal Entries]')
            for j in has_content:
                parts.append(f'— {j.date.strftime("%a %b %d")}:')
                if j.morning_intentions:
                    parts.append(f'  Intentions: {_strip_html(j.morning_intentions)[:150]}')
                if j.content:
                    parts.append(f'  Notes: {_strip_html(j.content)[:150]}')
                if j.evening_reflection:
                    parts.append(f'  Reflection: {_strip_html(j.evening_reflection)[:150]}')

    # Today's habit logs
    habit_logs = HabitLog.query.filter_by(date=today).all()
    custom_habits = CustomHabit.query.filter_by(is_active=True).all()
    custom_logs = CustomHabitLog.query.filter_by(date=today).all()
    custom_log_map = {cl.custom_habit_id: cl for cl in custom_logs}

    habit_parts = []
    for log in habit_logs:
        d = log.parsed_data
        if log.category == 'sleep' and log.is_completed:
            hours = d.get('hours', '?')
            quality = d.get('quality', '?')
            habit_parts.append(f'- Sleep: {hours} hours, quality {quality}/5')
        elif log.category == 'fitness' and log.is_completed:
            activity = d.get('activityType', '?')
            duration = d.get('duration', '?')
            intensity = d.get('intensity', '?')
            habit_parts.append(f'- Fitness: {activity} {duration}min ({intensity})')
        elif log.category == 'diet_health' and log.is_completed:
            water = d.get('waterIntake', 0)
            mood = d.get('moodRating', '?')
            habit_parts.append(f'- Diet & Health: {water} glasses water, mood {mood}/5')

    for habit in custom_habits:
        cl = custom_log_map.get(habit.id)
        if cl and cl.value:
            if habit.tracking_type == 'checkbox' and cl.value == 'true':
                habit_parts.append(f'- {habit.name}: completed')
            elif habit.tracking_type in ('number', 'duration'):
                try:
                    val = float(cl.value)
                    if val > 0:
                        habit_parts.append(f'- {habit.name}: {cl.value} {habit.unit or ""}')
                except (ValueError, TypeError):
                    pass
            elif habit.tracking_type == 'rating':
                habit_parts.append(f'- {habit.name}: {cl.value}/5')

    if habit_parts:
        parts.append("\n[Today's Habits]")
        parts.extend(habit_parts)

    # Upcoming events (next 7 days)
    events = CalendarEvent.query.filter(
        CalendarEvent.start >= now,
        CalendarEvent.start <= week_ahead,
    ).order_by(CalendarEvent.start).limit(10).all()

    if events:
        parts.append('\n[Upcoming Events]')
        for e in events:
            parts.append(
                f'- {e.title} on {e.start.strftime("%a %b %d at %I:%M %p")}'
            )

    # Recent notes (titles + plain-text previews)
    notes = Note.query.order_by(Note.updated_at.desc()).limit(5).all()
    if notes:
        parts.append('\n[Recent Notes]')
        for n in notes:
            preview = _strip_html(n.content)[:120]
            parts.append(f'- {n.title}: {preview}')

    return '\n'.join(parts)
