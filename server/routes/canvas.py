import json
from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.canvas_board import CanvasBoard

canvas_bp = Blueprint('canvas', __name__)


@canvas_bp.route('/api/canvas/boards', methods=['GET'])
def get_boards():
    boards = CanvasBoard.query.order_by(CanvasBoard.updated_at.desc()).all()
    return jsonify([{
        'id': b.id,
        'name': b.name,
        'mode': b.mode,
        'createdAt': b.created_at.isoformat() if b.created_at else None,
        'updatedAt': b.updated_at.isoformat() if b.updated_at else None,
    } for b in boards])


@canvas_bp.route('/api/canvas/boards', methods=['POST'])
def create_board():
    data = request.get_json()
    board = CanvasBoard(
        name=data.get('name', 'Untitled Board'),
        mode=data.get('mode', 'flowchart'),
        nodes=json.dumps(data.get('nodes', [])),
        edges=json.dumps(data.get('edges', [])),
        viewport=json.dumps(data.get('viewport', {})),
    )
    db.session.add(board)
    db.session.commit()
    return jsonify(board.to_dict()), 201


@canvas_bp.route('/api/canvas/boards/<int:id>', methods=['GET'])
def get_board(id):
    board = CanvasBoard.query.get_or_404(id)
    return jsonify(board.to_dict())


@canvas_bp.route('/api/canvas/boards/<int:id>', methods=['PUT'])
def update_board(id):
    board = CanvasBoard.query.get_or_404(id)
    data = request.get_json()

    if 'name' in data:
        board.name = data['name']
    if 'mode' in data:
        board.mode = data['mode']
    if 'nodes' in data:
        board.nodes = json.dumps(data['nodes'])
    if 'edges' in data:
        board.edges = json.dumps(data['edges'])
    if 'viewport' in data:
        board.viewport = json.dumps(data['viewport'])

    db.session.commit()
    return jsonify(board.to_dict())


@canvas_bp.route('/api/canvas/boards/<int:id>', methods=['DELETE'])
def delete_board(id):
    board = CanvasBoard.query.get_or_404(id)
    db.session.delete(board)
    db.session.commit()
    return jsonify({'message': 'Board deleted'}), 200
