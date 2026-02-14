import json
import requests
from flask import current_app


def get_ollama_response(messages, system_context=''):
    base_url = current_app.config.get('OLLAMA_BASE_URL', 'http://localhost:11434')
    model = current_app.config.get('OLLAMA_MODEL', 'llama3.2')

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
            f'and a model is pulled (ollama pull {model}).'
        )
    except Exception as e:
        return f'AI error: {str(e)}'


def stream_ollama_response(messages, system_context=''):
    """Generator that yields content tokens from Ollama's streaming API."""
    base_url = current_app.config.get('OLLAMA_BASE_URL', 'http://localhost:11434')
    model = current_app.config.get('OLLAMA_MODEL', 'llama3.2')

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
                'stream': True,
            },
            stream=True,
            timeout=120,
        )
        resp.raise_for_status()

        for line in resp.iter_lines():
            if not line:
                continue
            try:
                chunk = json.loads(line)
                content = chunk.get('message', {}).get('content', '')
                if content:
                    yield content
                if chunk.get('done'):
                    break
            except json.JSONDecodeError:
                continue

    except requests.ConnectionError:
        yield (
            'Could not connect to Ollama. '
            'Make sure Ollama is running (ollama serve) '
            f'and a model is pulled (ollama pull {model}).'
        )
    except Exception as e:
        yield f'AI error: {str(e)}'
