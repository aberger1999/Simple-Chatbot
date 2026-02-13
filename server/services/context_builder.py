import json
import re
from datetime import datetime, timedelta
from server.models.calendar_event import CalendarEvent
from server.models.goal import Goal
from server.models.note import Note
from server.models.journal_entry import JournalEntry
from server.models.habit_log import HabitLog
from server.models.custom_habit import CustomHabit
from server.models.custom_habit_log import CustomHabitLog


def build_context():
    now = datetime.utcnow()
    week_ahead = now + timedelta(days=7)

    parts = [
        'You are a helpful personal productivity assistant. '
        'You have access to the user\'s calendar, notes, and goals. '
        'Be concise and helpful. Today is '
        + now.strftime('%A, %B %d, %Y') + '.'
    ]

    # Upcoming events (next 7 days)
    events = CalendarEvent.query.filter(
        CalendarEvent.start >= now,
        CalendarEvent.start <= week_ahead,
    ).order_by(CalendarEvent.start).limit(10).all()

    if events:
        parts.append('\nUpcoming events (next 7 days):')
        for e in events:
            parts.append(
                f'- {e.title} on {e.start.strftime("%a %b %d at %I:%M %p")}'
            )

    # Active goals
    goals = Goal.query.filter_by(status='active').all()
    if goals:
        parts.append('\nActive goals:')
        for g in goals:
            if g.progress_mode == 'milestones' and g.milestones:
                completed = sum(1 for m in g.milestones if m.is_completed)
                total = len(g.milestones)
                parts.append(f'- {g.title} ({g.progress}% complete, {completed} of {total} milestones)')
            else:
                parts.append(f'- {g.title} ({g.progress}% complete)')

    # Today's journal entry
    today_journal = JournalEntry.query.filter_by(date=now.date()).first()
    if today_journal:
        parts.append('\nToday\'s journal:')
        if today_journal.morning_intentions:
            parts.append(f'- Morning intentions: {today_journal.morning_intentions[:200]}')
        if today_journal.content:
            stripped = re.sub(r'<[^>]+>', '', today_journal.content)[:200]
            parts.append(f'- Notes: {stripped}')

    # Today's habits
    today = now.date()
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
            habit_parts.append(f'- Fitness: {activity} {duration}min ({intensity} intensity)')
        elif log.category == 'finance' and log.is_completed:
            spend = d.get('dailySpend', '?')
            habit_parts.append(f'- Finance: ${spend} spent today')
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
        parts.append("\nToday's habits:")
        parts.extend(habit_parts)

    # Recent notes
    notes = Note.query.order_by(Note.updated_at.desc()).limit(5).all()
    if notes:
        parts.append('\nRecent notes:')
        for n in notes:
            preview = n.content[:100] if n.content else ''
            parts.append(f'- {n.title}: {preview}')

    return '\n'.join(parts)
