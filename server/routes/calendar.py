from datetime import datetime
from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.calendar_event import CalendarEvent

calendar_bp = Blueprint('calendar', __name__)


@calendar_bp.route('/api/calendar', methods=['GET'])
def get_events():
    start = request.args.get('start')
    end = request.args.get('end')

    range_start = datetime.fromisoformat(start) if start else None
    range_end = datetime.fromisoformat(end) if end else None

    # Non-recurring events: normal range filter
    nr_query = CalendarEvent.query.filter(
        db.or_(CalendarEvent.recurrence == '', CalendarEvent.recurrence.is_(None))
    )
    if range_start:
        nr_query = nr_query.filter(CalendarEvent.end >= range_start)
    if range_end:
        nr_query = nr_query.filter(CalendarEvent.start <= range_end)

    # Recurring events: started before range ends (they generate forward)
    r_query = CalendarEvent.query.filter(
        CalendarEvent.recurrence != '', CalendarEvent.recurrence.isnot(None)
    )
    if range_end:
        r_query = r_query.filter(CalendarEvent.start <= range_end)

    non_recurring = [e.to_dict() for e in nr_query.order_by(CalendarEvent.start).all()]
    recurring = [e.to_dict() for e in r_query.all()]

    # Expand recurring events into instances
    if recurring and range_start and range_end:
        from server.services.recurrence import expand_recurring_events
        expanded = expand_recurring_events(recurring, range_start, range_end)
    else:
        expanded = recurring

    all_events = non_recurring + expanded
    all_events.sort(key=lambda e: e['start'])
    return jsonify(all_events)


@calendar_bp.route('/api/calendar', methods=['POST'])
def create_event():
    data = request.get_json()
    event = CalendarEvent(
        title=data['title'],
        description=data.get('description', ''),
        start=datetime.fromisoformat(data['start']),
        end=datetime.fromisoformat(data['end']),
        all_day=data.get('allDay', False),
        color=data.get('color', '#3b82f6'),
        category=data.get('category', ''),
        recurrence=data.get('recurrence', ''),
        goal_id=data.get('goalId'),
    )
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict()), 201


@calendar_bp.route('/api/calendar/<int:id>', methods=['GET'])
def get_event(id):
    event = CalendarEvent.query.get_or_404(id)
    return jsonify(event.to_dict())


@calendar_bp.route('/api/calendar/<int:id>', methods=['PUT'])
def update_event(id):
    event = CalendarEvent.query.get_or_404(id)
    data = request.get_json()

    if 'title' in data:
        event.title = data['title']
    if 'description' in data:
        event.description = data['description']
    if 'start' in data:
        event.start = datetime.fromisoformat(data['start'])
    if 'end' in data:
        event.end = datetime.fromisoformat(data['end'])
    if 'allDay' in data:
        event.all_day = data['allDay']
    if 'color' in data:
        event.color = data['color']
    if 'category' in data:
        event.category = data['category']
    if 'recurrence' in data:
        event.recurrence = data['recurrence']
    if 'goalId' in data:
        event.goal_id = data['goalId']

    db.session.commit()
    return jsonify(event.to_dict())


@calendar_bp.route('/api/calendar/categories', methods=['GET'])
def get_categories():
    rows = db.session.query(CalendarEvent.category).filter(
        CalendarEvent.category != '', CalendarEvent.category.isnot(None)
    ).distinct().order_by(CalendarEvent.category).all()
    return jsonify([r[0] for r in rows])


@calendar_bp.route('/api/calendar/<int:id>', methods=['DELETE'])
def delete_event(id):
    event = CalendarEvent.query.get_or_404(id)
    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Event deleted'}), 200
