from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.blog_post import BlogPost

blog_bp = Blueprint('blog', __name__)


@blog_bp.route('/api/blog', methods=['GET'])
def get_posts():
    posts = BlogPost.query.order_by(BlogPost.created_at.desc()).all()
    return jsonify([p.to_dict() for p in posts])


@blog_bp.route('/api/blog', methods=['POST'])
def create_post():
    data = request.get_json()
    raw_tags = data.get('tags', '')
    normalized_tags = ','.join(t.strip().lower() for t in raw_tags.split(',') if t.strip())
    post = BlogPost(
        title=data['title'],
        content=data.get('content', ''),
        summary=data.get('summary', ''),
        cover_image=data.get('coverImage', ''),
        tags=normalized_tags,
        goal_id=data.get('goalId'),
    )
    db.session.add(post)
    db.session.commit()
    return jsonify(post.to_dict()), 201


@blog_bp.route('/api/blog/<int:id>', methods=['GET'])
def get_post(id):
    post = BlogPost.query.get_or_404(id)
    return jsonify(post.to_dict())


@blog_bp.route('/api/blog/<int:id>', methods=['PUT'])
def update_post(id):
    post = BlogPost.query.get_or_404(id)
    data = request.get_json()

    if 'title' in data:
        post.title = data['title']
    if 'content' in data:
        post.content = data['content']
    if 'summary' in data:
        post.summary = data['summary']
    if 'coverImage' in data:
        post.cover_image = data['coverImage']
    if 'tags' in data:
        raw_tags = data['tags']
        post.tags = ','.join(t.strip().lower() for t in raw_tags.split(',') if t.strip())
    if 'goalId' in data:
        post.goal_id = data['goalId']

    db.session.commit()
    return jsonify(post.to_dict())


@blog_bp.route('/api/blog/<int:id>', methods=['DELETE'])
def delete_post(id):
    post = BlogPost.query.get_or_404(id)
    db.session.delete(post)
    db.session.commit()
    return jsonify({'message': 'Post deleted'}), 200
