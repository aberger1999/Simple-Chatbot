from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.todo import TodoList, TodoItem

todos_bp = Blueprint('todos', __name__)


# --- Lists ---

@todos_bp.route('/api/todos/lists', methods=['GET'])
def get_lists():
    lists = TodoList.query.order_by(TodoList.position, TodoList.id).all()
    return jsonify([l.to_dict() for l in lists])


@todos_bp.route('/api/todos/lists', methods=['POST'])
def create_list():
    data = request.get_json()
    max_pos = db.session.query(db.func.coalesce(db.func.max(TodoList.position), -1)).scalar()
    lst = TodoList(
        name=data['name'],
        position=max_pos + 1,
    )
    db.session.add(lst)
    db.session.commit()
    return jsonify(lst.to_dict()), 201


@todos_bp.route('/api/todos/lists/<int:id>', methods=['PUT'])
def update_list(id):
    lst = TodoList.query.get_or_404(id)
    data = request.get_json()
    if 'name' in data:
        lst.name = data['name']
    if 'position' in data:
        lst.position = data['position']
    db.session.commit()
    return jsonify(lst.to_dict())


@todos_bp.route('/api/todos/lists/<int:id>', methods=['DELETE'])
def delete_list(id):
    lst = TodoList.query.get_or_404(id)
    db.session.delete(lst)
    db.session.commit()
    return jsonify({'message': 'List deleted'}), 200


# --- Items ---

@todos_bp.route('/api/todos/lists/<int:list_id>/items', methods=['GET'])
def get_items(list_id):
    TodoList.query.get_or_404(list_id)
    items = TodoItem.query.filter_by(list_id=list_id).order_by(TodoItem.position).all()
    return jsonify([i.to_dict() for i in items])


@todos_bp.route('/api/todos/lists/<int:list_id>/items', methods=['POST'])
def create_item(list_id):
    TodoList.query.get_or_404(list_id)
    data = request.get_json()
    max_pos = db.session.query(
        db.func.coalesce(db.func.max(TodoItem.position), -1)
    ).filter(TodoItem.list_id == list_id).scalar()
    item = TodoItem(
        list_id=list_id,
        text=data['text'],
        position=max_pos + 1,
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@todos_bp.route('/api/todos/items/<int:id>', methods=['PUT'])
def update_item(id):
    item = TodoItem.query.get_or_404(id)
    data = request.get_json()
    if 'text' in data:
        item.text = data['text']
    if 'completed' in data:
        item.completed = data['completed']
    if 'position' in data:
        item.position = data['position']
    if 'listId' in data:
        item.list_id = data['listId']
    db.session.commit()
    return jsonify(item.to_dict())


@todos_bp.route('/api/todos/items/<int:id>', methods=['DELETE'])
def delete_item(id):
    item = TodoItem.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item deleted'}), 200
