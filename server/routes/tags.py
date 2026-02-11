from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.custom_tag import CustomTag
from server.models.note import Note
from server.models.blog_post import BlogPost

tags_bp = Blueprint('tags', __name__)

PRESET_TAGS = [
    'work', 'personal', 'ideas', 'finance', 'health', 'travel',
    'recipes', 'projects', 'learning', 'shopping', 'journal',
    'meeting', 'important', 'reference',
]


@tags_bp.route('/api/tags', methods=['GET'])
def get_tags():
    custom_tags = CustomTag.query.order_by(CustomTag.name).all()
    return jsonify({
        'presetTags': PRESET_TAGS,
        'customTags': [t.to_dict() for t in custom_tags],
    })


@tags_bp.route('/api/tags', methods=['POST'])
def create_tag():
    data = request.get_json()
    name = data.get('name', '').strip().lower()

    if not name:
        return jsonify({'error': 'Tag name is required'}), 400
    if ',' in name:
        return jsonify({'error': 'Tag name cannot contain commas'}), 400
    if name in PRESET_TAGS:
        return jsonify({'error': 'This is already a preset tag'}), 400
    if CustomTag.query.filter_by(name=name).first():
        return jsonify({'error': 'This custom tag already exists'}), 400

    tag = CustomTag(name=name)
    db.session.add(tag)
    db.session.commit()
    return jsonify(tag.to_dict()), 201


def _propagate_tag_rename(old_name, new_name):
    """Rename a tag across all notes and blog posts."""
    for model in (Note, BlogPost):
        items = model.query.filter(model.tags.ilike(f'%{old_name}%')).all()
        for item in items:
            tags = [t.strip() for t in item.tags.split(',') if t.strip()]
            tags = [new_name if t == old_name else t for t in tags]
            item.tags = ','.join(tags)


def _remove_tag_from_items(tag_name):
    """Remove a tag from all notes and blog posts."""
    for model in (Note, BlogPost):
        items = model.query.filter(model.tags.ilike(f'%{tag_name}%')).all()
        for item in items:
            tags = [t.strip() for t in item.tags.split(',') if t.strip()]
            tags = [t for t in tags if t != tag_name]
            item.tags = ','.join(tags)


@tags_bp.route('/api/tags/<int:id>', methods=['PUT'])
def update_tag(id):
    tag = CustomTag.query.get_or_404(id)
    data = request.get_json()
    new_name = data.get('name', '').strip().lower()

    if not new_name:
        return jsonify({'error': 'Tag name is required'}), 400
    if ',' in new_name:
        return jsonify({'error': 'Tag name cannot contain commas'}), 400
    if new_name in PRESET_TAGS:
        return jsonify({'error': 'Cannot rename to a preset tag name'}), 400
    existing = CustomTag.query.filter_by(name=new_name).first()
    if existing and existing.id != tag.id:
        return jsonify({'error': 'A custom tag with this name already exists'}), 400

    old_name = tag.name
    _propagate_tag_rename(old_name, new_name)
    tag.name = new_name
    db.session.commit()
    return jsonify(tag.to_dict())


@tags_bp.route('/api/tags/<int:id>', methods=['DELETE'])
def delete_tag(id):
    tag = CustomTag.query.get_or_404(id)
    _remove_tag_from_items(tag.name)
    db.session.delete(tag)
    db.session.commit()
    return jsonify({'message': 'Tag deleted'}), 200
