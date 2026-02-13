from datetime import datetime
from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.journal_entry import JournalEntry

journal_bp = Blueprint('journal', __name__)


@journal_bp.route('/api/journal/recent', methods=['GET'])
def get_recent_entries():
    limit = request.args.get('limit', 7, type=int)
    entries = JournalEntry.query.order_by(JournalEntry.date.desc()).limit(limit).all()
    return jsonify([e.to_dict() for e in entries])


@journal_bp.route('/api/journal/<date_str>', methods=['GET'])
def get_entry(date_str):
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    entry = JournalEntry.query.filter_by(date=date).first()
    if not entry:
        entry = JournalEntry(date=date)
        db.session.add(entry)
        db.session.commit()

    return jsonify(entry.to_dict())


@journal_bp.route('/api/journal/<date_str>', methods=['PUT'])
def update_entry(date_str):
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    entry = JournalEntry.query.filter_by(date=date).first()
    if not entry:
        entry = JournalEntry(date=date)
        db.session.add(entry)

    data = request.get_json()

    if 'morningIntentions' in data:
        entry.morning_intentions = data['morningIntentions']
    if 'content' in data:
        entry.content = data['content']
    if 'eveningReflection' in data:
        entry.evening_reflection = data['eveningReflection']

    db.session.commit()
    return jsonify(entry.to_dict())
