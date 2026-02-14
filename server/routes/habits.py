import json
from datetime import date, datetime, timedelta
from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.habit_log import HabitLog, VALID_CATEGORIES
from server.models.custom_habit import CustomHabit
from server.models.custom_habit_log import CustomHabitLog

habits_bp = Blueprint('habits', __name__)


def _week_bounds(d):
    """Return Monday and Sunday for the week containing date d."""
    monday = d - timedelta(days=d.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def _calc_streak(is_completed_fn, max_days=90):
    """Count consecutive completed days ending at yesterday or today."""
    streak = 0
    today = date.today()
    for offset in range(max_days):
        check_date = today - timedelta(days=offset)
        if is_completed_fn(check_date):
            streak += 1
        else:
            break
    return streak


def _preset_completed_on(category, d):
    log = HabitLog.query.filter_by(date=d, category=category).first()
    return log.is_completed if log else False


def _custom_completed_on(habit, d):
    log = CustomHabitLog.query.filter_by(date=d, custom_habit_id=habit.id).first()
    if not log or not log.value:
        return False
    if habit.tracking_type == 'checkbox':
        return log.value == 'true'
    try:
        return float(log.value) > 0
    except (ValueError, TypeError):
        return False


@habits_bp.route('/api/habits/week', methods=['GET'])
def get_week():
    date_str = request.args.get('date')
    if date_str:
        try:
            d = date.fromisoformat(date_str)
        except ValueError:
            return jsonify({'error': 'Invalid date'}), 400
    else:
        d = date.today()

    monday, sunday = _week_bounds(d)

    # Preset logs for the week
    logs = HabitLog.query.filter(
        HabitLog.date >= monday,
        HabitLog.date <= sunday,
    ).all()

    logs_by_day = {}
    for log in logs:
        day_str = log.date.isoformat()
        if day_str not in logs_by_day:
            logs_by_day[day_str] = {}
        logs_by_day[day_str][log.category] = log.to_dict()

    # Custom habits
    custom_habits = CustomHabit.query.filter_by(is_active=True).order_by(CustomHabit.position).all()

    # Custom logs for the week
    custom_logs_raw = CustomHabitLog.query.filter(
        CustomHabitLog.date >= monday,
        CustomHabitLog.date <= sunday,
    ).all()

    custom_logs_by_day = {}
    for cl in custom_logs_raw:
        day_str = cl.date.isoformat()
        if day_str not in custom_logs_by_day:
            custom_logs_by_day[day_str] = {}
        custom_logs_by_day[day_str][str(cl.custom_habit_id)] = cl.to_dict()

    # Streaks
    streaks = {}
    for cat in VALID_CATEGORIES:
        streaks[cat] = _calc_streak(lambda d, c=cat: _preset_completed_on(c, d))
    for habit in custom_habits:
        streaks[f'custom_{habit.id}'] = _calc_streak(lambda d, h=habit: _custom_completed_on(h, d))

    return jsonify({
        'weekStart': monday.isoformat(),
        'weekEnd': sunday.isoformat(),
        'logs': logs_by_day,
        'customHabits': [h.to_dict() for h in custom_habits],
        'customLogs': custom_logs_by_day,
        'streaks': streaks,
    })


@habits_bp.route('/api/habits/log/<date_str>/<category>', methods=['PUT'])
def upsert_preset_log(date_str, category):
    if category not in VALID_CATEGORIES:
        return jsonify({'error': f'Invalid category: {category}'}), 400

    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date'}), 400

    data = request.get_json()
    log = HabitLog.query.filter_by(date=d, category=category).first()

    if log:
        log.data = json.dumps(data)
        log.updated_at = datetime.utcnow()
    else:
        log = HabitLog(date=d, category=category, data=json.dumps(data))
        db.session.add(log)

    db.session.commit()
    return jsonify(log.to_dict())


@habits_bp.route('/api/habits/log/<date_str>/<category>', methods=['DELETE'])
def delete_preset_log(date_str, category):
    if category not in VALID_CATEGORIES:
        return jsonify({'error': f'Invalid category: {category}'}), 400

    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date'}), 400

    log = HabitLog.query.filter_by(date=d, category=category).first()
    if not log:
        return jsonify({'error': 'Log not found'}), 404

    db.session.delete(log)
    db.session.commit()
    return jsonify({'message': 'Log deleted'}), 200


@habits_bp.route('/api/habits/custom', methods=['GET'])
def get_custom_habits():
    habits = CustomHabit.query.filter_by(is_active=True).order_by(CustomHabit.position).all()
    return jsonify([h.to_dict() for h in habits])


@habits_bp.route('/api/habits/custom', methods=['POST'])
def create_custom_habit():
    data = request.get_json()
    max_pos = db.session.query(db.func.max(CustomHabit.position)).scalar() or 0
    habit = CustomHabit(
        name=data['name'],
        tracking_type=data.get('trackingType', 'checkbox'),
        target_value=data.get('targetValue'),
        unit=data.get('unit'),
        icon=data.get('icon', ''),
        frequency=data.get('frequency', 'daily'),
        position=max_pos + 1,
    )
    db.session.add(habit)
    db.session.commit()
    return jsonify(habit.to_dict()), 201


@habits_bp.route('/api/habits/custom/<int:id>', methods=['PUT'])
def update_custom_habit(id):
    habit = CustomHabit.query.get_or_404(id)
    data = request.get_json()

    if 'name' in data:
        habit.name = data['name']
    if 'trackingType' in data:
        habit.tracking_type = data['trackingType']
    if 'targetValue' in data:
        habit.target_value = data['targetValue']
    if 'unit' in data:
        habit.unit = data['unit']
    if 'frequency' in data:
        habit.frequency = data['frequency']
    if 'isActive' in data:
        habit.is_active = data['isActive']
    if 'icon' in data:
        habit.icon = data['icon']
    if 'position' in data:
        habit.position = data['position']

    db.session.commit()
    return jsonify(habit.to_dict())


@habits_bp.route('/api/habits/custom/<int:id>', methods=['DELETE'])
def delete_custom_habit(id):
    habit = CustomHabit.query.get_or_404(id)
    db.session.delete(habit)
    db.session.commit()
    return jsonify({'message': 'Habit deleted'}), 200


@habits_bp.route('/api/habits/custom-log/<date_str>/<int:habit_id>', methods=['PUT'])
def upsert_custom_log(date_str, habit_id):
    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date'}), 400

    CustomHabit.query.get_or_404(habit_id)
    data = request.get_json()
    value = str(data.get('value', ''))

    log = CustomHabitLog.query.filter_by(date=d, custom_habit_id=habit_id).first()
    if log:
        log.value = value
    else:
        log = CustomHabitLog(date=d, custom_habit_id=habit_id, value=value)
        db.session.add(log)

    db.session.commit()
    return jsonify(log.to_dict())
