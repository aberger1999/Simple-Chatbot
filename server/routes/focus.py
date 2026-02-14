import json
from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.focus_session import FocusSession

focus_bp = Blueprint('focus', __name__)


@focus_bp.route('/api/focus-sessions', methods=['GET'])
def get_sessions():
    limit = request.args.get('limit', type=int)
    query = FocusSession.query.order_by(FocusSession.created_at.desc())
    if limit:
        query = query.limit(limit)
    sessions = query.all()
    return jsonify([s.to_dict() for s in sessions])


@focus_bp.route('/api/focus-sessions/stats', methods=['GET'])
def get_stats():
    total = FocusSession.query.count()
    completed = FocusSession.query.filter_by(status='completed').count()
    total_minutes = db.session.query(
        db.func.coalesce(db.func.sum(FocusSession.actual_duration), 0)
    ).scalar() // 60
    return jsonify({
        'totalSessions': total,
        'completedSessions': completed,
        'totalMinutes': total_minutes,
    })


@focus_bp.route('/api/focus-sessions', methods=['POST'])
def create_session():
    data = request.get_json()
    session = FocusSession(
        title=data.get('title', ''),
        notes=data.get('notes', ''),
        planned_duration=data['plannedDuration'],
        actual_duration=data['actualDuration'],
        status=data.get('status', 'completed'),
        goal_ids=json.dumps(data.get('goalIds', [])),
        habit_ids=json.dumps(data.get('habitIds', [])),
        habit_categories=json.dumps(data.get('habitCategories', [])),
    )
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict()), 201


@focus_bp.route('/api/focus-sessions/<int:id>', methods=['GET'])
def get_session(id):
    session = FocusSession.query.get_or_404(id)
    return jsonify(session.to_dict())


@focus_bp.route('/api/focus-sessions/<int:id>', methods=['PUT'])
def update_session(id):
    session = FocusSession.query.get_or_404(id)
    data = request.get_json()

    if 'title' in data:
        session.title = data['title']
    if 'notes' in data:
        session.notes = data['notes']
    if 'goalIds' in data:
        session.goal_ids = json.dumps(data['goalIds'])
    if 'habitIds' in data:
        session.habit_ids = json.dumps(data['habitIds'])
    if 'habitCategories' in data:
        session.habit_categories = json.dumps(data['habitCategories'])

    db.session.commit()
    return jsonify(session.to_dict())


@focus_bp.route('/api/focus-sessions/<int:id>', methods=['DELETE'])
def delete_session(id):
    session = FocusSession.query.get_or_404(id)
    db.session.delete(session)
    db.session.commit()
    return jsonify({'message': 'Session deleted'}), 200
