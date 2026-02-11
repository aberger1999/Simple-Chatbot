from datetime import datetime, timedelta
from server.models.calendar_event import CalendarEvent
from server.models.goal import Goal
from server.models.note import Note


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
            parts.append(f'- {g.title} ({g.progress}% complete)')

    # Recent notes
    notes = Note.query.order_by(Note.updated_at.desc()).limit(5).all()
    if notes:
        parts.append('\nRecent notes:')
        for n in notes:
            preview = n.content[:100] if n.content else ''
            parts.append(f'- {n.title}: {preview}')

    return '\n'.join(parts)
