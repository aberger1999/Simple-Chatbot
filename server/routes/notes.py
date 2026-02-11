from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.note import Note

notes_bp = Blueprint('notes', __name__)


@notes_bp.route('/api/notes', methods=['GET'])
def get_notes():
    query = Note.query
    search = request.args.get('search')
    tag = request.args.get('tag')
    goal_id = request.args.get('goal_id')

    if search:
        query = query.filter(
            db.or_(
                Note.title.ilike(f'%{search}%'),
                Note.content.ilike(f'%{search}%'),
                Note.tags.ilike(f'%{search}%'),
            )
        )
    if tag:
        query = query.filter(Note.tags.ilike(f'%{tag}%'))
    if goal_id:
        query = query.filter(Note.goal_id == int(goal_id))

    notes = query.order_by(Note.is_pinned.desc(), Note.updated_at.desc()).all()
    return jsonify([n.to_dict() for n in notes])


@notes_bp.route('/api/notes', methods=['POST'])
def create_note():
    data = request.get_json()
    raw_tags = data.get('tags', '')
    normalized_tags = ','.join(t.strip().lower() for t in raw_tags.split(',') if t.strip())
    note = Note(
        title=data['title'],
        content=data.get('content', ''),
        tags=normalized_tags,
        is_pinned=data.get('isPinned', False),
        goal_id=data.get('goalId'),
    )
    db.session.add(note)
    db.session.commit()
    return jsonify(note.to_dict()), 201


@notes_bp.route('/api/notes/<int:id>', methods=['GET'])
def get_note(id):
    note = Note.query.get_or_404(id)
    return jsonify(note.to_dict())


@notes_bp.route('/api/notes/<int:id>', methods=['PUT'])
def update_note(id):
    note = Note.query.get_or_404(id)
    data = request.get_json()

    if 'title' in data:
        note.title = data['title']
    if 'content' in data:
        note.content = data['content']
    if 'tags' in data:
        raw_tags = data['tags']
        note.tags = ','.join(t.strip().lower() for t in raw_tags.split(',') if t.strip())
    if 'isPinned' in data:
        note.is_pinned = data['isPinned']
    if 'goalId' in data:
        note.goal_id = data['goalId']

    db.session.commit()
    return jsonify(note.to_dict())


@notes_bp.route('/api/notes/<int:id>', methods=['DELETE'])
def delete_note(id):
    note = Note.query.get_or_404(id)
    db.session.delete(note)
    db.session.commit()
    return jsonify({'message': 'Note deleted'}), 200
