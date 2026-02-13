import re
from datetime import datetime, timedelta
from server.models.calendar_event import CalendarEvent
from server.models.goal import Goal
from server.models.note import Note
from server.models.journal_entry import JournalEntry


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

    # Recent notes
    notes = Note.query.order_by(Note.updated_at.desc()).limit(5).all()
    if notes:
        parts.append('\nRecent notes:')
        for n in notes:
            preview = n.content[:100] if n.content else ''
            parts.append(f'- {n.title}: {preview}')

    return '\n'.join(parts)
