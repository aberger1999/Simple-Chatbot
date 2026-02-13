from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.goal import Goal
from server.models.milestone import Milestone
from server.models.sub_milestone import SubMilestone

milestones_bp = Blueprint('milestones', __name__)


def _recalculate_progress(goal):
    """Recalculate goal progress from milestones. Only runs when progress_mode == 'milestones'."""
    if goal.progress_mode != 'milestones':
        return
    milestones = goal.milestones
    if not milestones:
        goal.progress = 0
    else:
        completed = sum(1 for m in milestones if m.is_completed)
        goal.progress = round((completed / len(milestones)) * 100)


# --- Milestones ---

@milestones_bp.route('/api/goals/<int:goal_id>/milestones', methods=['GET'])
def get_milestones(goal_id):
    Goal.query.get_or_404(goal_id)
    milestones = Milestone.query.filter_by(goal_id=goal_id).order_by(Milestone.position).all()
    return jsonify([m.to_dict() for m in milestones])


@milestones_bp.route('/api/goals/<int:goal_id>/milestones', methods=['POST'])
def create_milestone(goal_id):
    goal = Goal.query.get_or_404(goal_id)
    data = request.get_json()
    max_pos = db.session.query(db.func.max(Milestone.position)).filter_by(goal_id=goal_id).scalar()
    milestone = Milestone(
        goal_id=goal_id,
        title=data['title'],
        position=(max_pos or 0) + 1,
    )
    db.session.add(milestone)
    _recalculate_progress(goal)
    db.session.commit()
    return jsonify({**milestone.to_dict(), 'goalProgress': goal.progress}), 201


@milestones_bp.route('/api/milestones/<int:id>', methods=['PUT'])
def update_milestone(id):
    milestone = Milestone.query.get_or_404(id)
    data = request.get_json()
    if 'title' in data:
        milestone.title = data['title']
    if 'isCompleted' in data:
        milestone.is_completed = data['isCompleted']
    if 'position' in data:
        milestone.position = data['position']
    goal = Goal.query.get(milestone.goal_id)
    _recalculate_progress(goal)
    db.session.commit()
    return jsonify({**milestone.to_dict(), 'goalProgress': goal.progress})


@milestones_bp.route('/api/milestones/<int:id>', methods=['DELETE'])
def delete_milestone(id):
    milestone = Milestone.query.get_or_404(id)
    goal = Goal.query.get(milestone.goal_id)
    db.session.delete(milestone)
    db.session.flush()
    _recalculate_progress(goal)
    db.session.commit()
    return jsonify({'message': 'Milestone deleted', 'goalProgress': goal.progress})


# --- Sub-milestones ---

@milestones_bp.route('/api/milestones/<int:milestone_id>/sub', methods=['POST'])
def create_sub_milestone(milestone_id):
    Milestone.query.get_or_404(milestone_id)
    data = request.get_json()
    max_pos = db.session.query(db.func.max(SubMilestone.position)).filter_by(milestone_id=milestone_id).scalar()
    sub = SubMilestone(
        milestone_id=milestone_id,
        title=data['title'],
        position=(max_pos or 0) + 1,
    )
    db.session.add(sub)
    db.session.commit()
    return jsonify(sub.to_dict()), 201


@milestones_bp.route('/api/sub-milestones/<int:id>', methods=['PUT'])
def update_sub_milestone(id):
    sub = SubMilestone.query.get_or_404(id)
    data = request.get_json()
    if 'title' in data:
        sub.title = data['title']
    if 'isCompleted' in data:
        sub.is_completed = data['isCompleted']
    if 'position' in data:
        sub.position = data['position']
    db.session.commit()
    return jsonify(sub.to_dict())


@milestones_bp.route('/api/sub-milestones/<int:id>', methods=['DELETE'])
def delete_sub_milestone(id):
    sub = SubMilestone.query.get_or_404(id)
    db.session.delete(sub)
    db.session.commit()
    return jsonify({'message': 'Sub-milestone deleted'})
