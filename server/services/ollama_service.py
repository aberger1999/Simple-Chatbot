import requests
from flask import current_app


def get_ollama_response(messages, system_context=''):
    base_url = current_app.config.get('OLLAMA_BASE_URL', 'http://localhost:11434')
    model = current_app.config.get('OLLAMA_MODEL', 'mistral')

    ollama_messages = []
    if system_context:
        ollama_messages.append({'role': 'system', 'content': system_context})

    ollama_messages.extend(messages)

    try:
        resp = requests.post(
            f'{base_url}/api/chat',
            json={
                'model': model,
                'messages': ollama_messages,
                'stream': False,
            },
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get('message', {}).get('content', 'No response from AI.')
    except requests.ConnectionError:
        return (
            'Could not connect to Ollama. '
            'Make sure Ollama is running (ollama serve) '
            'and a model is pulled (ollama pull mistral).'
        )
    except Exception as e:
        return f'AI error: {str(e)}'
