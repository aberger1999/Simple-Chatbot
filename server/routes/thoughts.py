import math
from datetime import datetime
from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.community import Community
from server.models.thought_post import ThoughtPost
from server.models.comment import Comment
from server.models.vote import Vote

thoughts_bp = Blueprint('thoughts', __name__)

EPOCH = datetime(1970, 1, 1)


def _hot_score(vote_score, created_at):
    """Reddit-style hot ranking."""
    score = vote_score
    order = math.log10(max(abs(score), 1))
    sign = 1 if score > 0 else -1 if score < 0 else 0
    seconds = (created_at - EPOCH).total_seconds()
    return sign * order + seconds / 45000


# ── Communities ──────────────────────────────────────────

@thoughts_bp.route('/api/thoughts/communities', methods=['GET'])
def get_communities():
    communities = Community.query.order_by(Community.name).all()
    return jsonify([c.to_dict() for c in communities])


@thoughts_bp.route('/api/thoughts/communities', methods=['POST'])
def create_community():
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Community name is required'}), 400
    if Community.query.filter_by(name=name).first():
        return jsonify({'error': 'Community already exists'}), 400
    community = Community(name=name)
    db.session.add(community)
    db.session.commit()
    return jsonify(community.to_dict()), 201


@thoughts_bp.route('/api/thoughts/communities/<int:id>', methods=['DELETE'])
def delete_community(id):
    community = Community.query.get_or_404(id)
    db.session.delete(community)
    db.session.commit()
    return jsonify({'message': 'Community deleted'}), 200


# ── Posts ────────────────────────────────────────────────

@thoughts_bp.route('/api/thoughts/posts', methods=['GET'])
def get_posts():
    community = request.args.get('community')
    sort = request.args.get('sort', 'new')

    query = ThoughtPost.query
    if community:
        query = query.filter_by(community_id=community)

    posts = query.all()

    if sort == 'top':
        posts.sort(key=lambda p: (p.vote_score(), p.created_at), reverse=True)
    elif sort == 'hot':
        posts.sort(key=lambda p: _hot_score(p.vote_score(), p.created_at), reverse=True)
    else:  # new
        posts.sort(key=lambda p: p.created_at, reverse=True)

    return jsonify([p.to_dict() for p in posts])


@thoughts_bp.route('/api/thoughts/posts', methods=['POST'])
def create_post():
    data = request.get_json()
    raw_tags = data.get('tags', '')
    normalized_tags = ','.join(t.strip().lower() for t in raw_tags.split(',') if t.strip())
    post = ThoughtPost(
        title=data['title'],
        body=data.get('body', ''),
        tags=normalized_tags,
        community_id=data['communityId'],
        goal_id=data.get('goalId'),
    )
    db.session.add(post)
    db.session.commit()
    return jsonify(post.to_dict()), 201


@thoughts_bp.route('/api/thoughts/posts/<int:id>', methods=['GET'])
def get_post(id):
    post = ThoughtPost.query.get_or_404(id)
    result = post.to_dict()

    # Flat comments list
    comments = Comment.query.filter_by(post_id=id).order_by(Comment.created_at).all()
    result['comments'] = [c.to_dict() for c in comments]

    # User's votes on this post and its comments
    post_vote = Vote.query.filter_by(target_type='post', target_id=id).first()
    result['userVote'] = post_vote.value if post_vote else 0

    comment_ids = [c.id for c in comments]
    comment_votes = {}
    if comment_ids:
        votes = Vote.query.filter(
            Vote.target_type == 'comment', Vote.target_id.in_(comment_ids)
        ).all()
        for v in votes:
            comment_votes[v.target_id] = v.value
    result['commentVotes'] = comment_votes

    return jsonify(result)


@thoughts_bp.route('/api/thoughts/posts/<int:id>', methods=['PUT'])
def update_post(id):
    post = ThoughtPost.query.get_or_404(id)
    data = request.get_json()

    if 'title' in data:
        post.title = data['title']
    if 'body' in data:
        post.body = data['body']
    if 'tags' in data:
        raw_tags = data['tags']
        post.tags = ','.join(t.strip().lower() for t in raw_tags.split(',') if t.strip())
    if 'communityId' in data:
        post.community_id = data['communityId']
    if 'goalId' in data:
        post.goal_id = data['goalId']

    db.session.commit()
    return jsonify(post.to_dict())


@thoughts_bp.route('/api/thoughts/posts/<int:id>', methods=['DELETE'])
def delete_post(id):
    post = ThoughtPost.query.get_or_404(id)
    # Delete associated votes
    Vote.query.filter_by(target_type='post', target_id=id).delete()
    # Delete comment votes
    comment_ids = [c.id for c in post.comments]
    if comment_ids:
        Vote.query.filter(Vote.target_type == 'comment', Vote.target_id.in_(comment_ids)).delete(synchronize_session=False)
    db.session.delete(post)
    db.session.commit()
    return jsonify({'message': 'Post deleted'}), 200


# ── Comments ─────────────────────────────────────────────

@thoughts_bp.route('/api/thoughts/posts/<int:post_id>/comments', methods=['POST'])
def create_comment(post_id):
    ThoughtPost.query.get_or_404(post_id)
    data = request.get_json()
    comment = Comment(
        post_id=post_id,
        parent_id=data.get('parentId'),
        body=data['body'],
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment.to_dict()), 201


@thoughts_bp.route('/api/thoughts/comments/<int:id>', methods=['DELETE'])
def delete_comment(id):
    comment = Comment.query.get_or_404(id)
    Vote.query.filter_by(target_type='comment', target_id=id).delete()
    db.session.delete(comment)
    db.session.commit()
    return jsonify({'message': 'Comment deleted'}), 200


# ── Voting ───────────────────────────────────────────────

@thoughts_bp.route('/api/thoughts/vote', methods=['POST'])
def cast_vote():
    data = request.get_json()
    target_type = data['targetType']  # 'post' or 'comment'
    target_id = data['targetId']
    value = data['value']  # +1 or -1

    existing = Vote.query.filter_by(target_type=target_type, target_id=target_id).first()

    if existing:
        if existing.value == value:
            # Same direction — remove vote
            db.session.delete(existing)
        else:
            # Opposite direction — switch
            existing.value = value
    else:
        vote = Vote(target_type=target_type, target_id=target_id, value=value)
        db.session.add(vote)

    db.session.commit()

    # Return updated score
    score = db.session.query(db.func.coalesce(db.func.sum(Vote.value), 0)).filter(
        Vote.target_type == target_type, Vote.target_id == target_id
    ).scalar()

    current_vote = Vote.query.filter_by(target_type=target_type, target_id=target_id).first()

    return jsonify({
        'score': score,
        'userVote': current_vote.value if current_vote else 0,
    })
