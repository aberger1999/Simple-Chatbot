import uuid
from flask import Blueprint, request, jsonify
from server.models.base import db
from server.models.chat_message import ChatMessage
from server.services.legacy_chat import get_legacy_response
from server.services.ollama_service import get_ollama_response
from server.services.context_builder import build_context

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '')
    mode = data.get('mode', 'ollama')
    session_id = data.get('sessionId') or str(uuid.uuid4())

    # Save user message
    user_msg = ChatMessage(
        role='user', content=message, mode=mode, session_id=session_id
    )
    db.session.add(user_msg)
    db.session.commit()

    if mode == 'legacy':
        response = get_legacy_response(message)
    else:
        # Get conversation history
        history = ChatMessage.query.filter_by(
            session_id=session_id
        ).order_by(ChatMessage.created_at.desc()).limit(20).all()
        history.reverse()

        messages = [{'role': m.role, 'content': m.content} for m in history]
        context = build_context()
        response = get_ollama_response(messages, context)

    # Save assistant message
    assistant_msg = ChatMessage(
        role='assistant', content=response, mode=mode, session_id=session_id
    )
    db.session.add(assistant_msg)
    db.session.commit()

    return jsonify({
        'answer': response,
        'sessionId': session_id,
        'mode': mode,
    })


@chat_bp.route('/api/chat/history', methods=['GET'])
def get_history():
    session_id = request.args.get('sessionId')
    if not session_id:
        return jsonify([])

    messages = ChatMessage.query.filter_by(
        session_id=session_id
    ).order_by(ChatMessage.created_at).all()
    return jsonify([m.to_dict() for m in messages])


@chat_bp.route('/api/chat/sessions', methods=['GET'])
def get_sessions():
    sessions = db.session.query(
        ChatMessage.session_id,
        db.func.min(ChatMessage.created_at).label('started'),
        db.func.max(ChatMessage.created_at).label('last_message'),
        db.func.count(ChatMessage.id).label('message_count'),
    ).group_by(ChatMessage.session_id).order_by(
        db.func.max(ChatMessage.created_at).desc()
    ).all()

    return jsonify([{
        'sessionId': s.session_id,
        'started': s.started.isoformat(),
        'lastMessage': s.last_message.isoformat(),
        'messageCount': s.message_count,
    } for s in sessions])


@chat_bp.route('/api/chat/sessions', methods=['POST'])
def create_session():
    return jsonify({'sessionId': str(uuid.uuid4())})
