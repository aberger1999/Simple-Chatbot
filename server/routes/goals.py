from datetime import datetime
from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.goal import Goal

goals_bp = Blueprint('goals', __name__)


@goals_bp.route('/api/goals', methods=['GET'])
def get_goals():
    goals = Goal.query.order_by(Goal.created_at.desc()).all()
    return jsonify([g.to_dict() for g in goals])


@goals_bp.route('/api/goals', methods=['POST'])
def create_goal():
    data = request.get_json()
    goal = Goal(
        title=data['title'],
        description=data.get('description', ''),
        status=data.get('status', 'active'),
        target_date=datetime.fromisoformat(data['targetDate']) if data.get('targetDate') else None,
        progress=data.get('progress', 0),
        progress_mode=data.get('progressMode', 'manual'),
        color=data.get('color', '#8b5cf6'),
    )
    db.session.add(goal)
    db.session.commit()
    return jsonify(goal.to_dict()), 201


@goals_bp.route('/api/goals/<int:id>', methods=['GET'])
def get_goal(id):
    goal = Goal.query.get_or_404(id)
    result = goal.to_dict()
    result['notes'] = [n.to_dict() for n in goal.notes.all()]
    result['thoughtPosts'] = [p.to_dict() for p in goal.thought_posts.all()]
    result['events'] = [e.to_dict() for e in goal.events.all()]
    return jsonify(result)


@goals_bp.route('/api/goals/<int:id>', methods=['PUT'])
def update_goal(id):
    goal = Goal.query.get_or_404(id)
    data = request.get_json()

    if 'title' in data:
        goal.title = data['title']
    if 'description' in data:
        goal.description = data['description']
    if 'status' in data:
        goal.status = data['status']
    if 'targetDate' in data:
        goal.target_date = datetime.fromisoformat(data['targetDate']) if data['targetDate'] else None
    if 'progress' in data:
        goal.progress = data['progress']
    if 'progressMode' in data:
        goal.progress_mode = data['progressMode']
        # Recalculate progress when switching to milestones mode
        if data['progressMode'] == 'milestones':
            milestones = goal.milestones
            if milestones:
                completed = sum(1 for m in milestones if m.is_completed)
                goal.progress = round((completed / len(milestones)) * 100)
            else:
                goal.progress = 0
    if 'color' in data:
        goal.color = data['color']

    db.session.commit()
    return jsonify(goal.to_dict())


@goals_bp.route('/api/goals/<int:id>', methods=['DELETE'])
def delete_goal(id):
    goal = Goal.query.get_or_404(id)
    db.session.delete(goal)
    db.session.commit()
    return jsonify({'message': 'Goal deleted'}), 200
