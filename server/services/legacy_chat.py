import os
import sys
import random
import json
import torch
from datetime import datetime, date

# Add legacy directory to path for imports
LEGACY_DIR = os.path.join(os.path.dirname(__file__), '..', 'legacy')
sys.path.insert(0, LEGACY_DIR)

from model import NeuralNet
from nltk_utils import bag_of_words, tokenize

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Load intents and model
intents_path = os.path.join(LEGACY_DIR, 'intents.json')
model_path = os.path.join(LEGACY_DIR, 'data.pth')

_model = None
_intents = None
_all_words = None
_tags = None


def _load_model():
    global _model, _intents, _all_words, _tags

    if _model is not None:
        return

    with open(intents_path, 'r') as f:
        _intents = json.load(f)

    if not os.path.exists(model_path):
        # Try loading from root directory as fallback
        root_model = os.path.join(LEGACY_DIR, '..', '..', 'data.pth')
        if os.path.exists(root_model):
            data = torch.load(root_model, weights_only=False)
        else:
            raise FileNotFoundError(
                'No trained model found. Run train.py first.'
            )
    else:
        data = torch.load(model_path, weights_only=False)

    _all_words = data['all_words']
    _tags = data['tags']

    model = NeuralNet(
        data['input_size'], data['hidden_size'], data['output_size']
    ).to(device)
    model.load_state_dict(data['model_state'])
    model.eval()
    _model = model


def get_legacy_response(msg):
    _load_model()

    sentence = tokenize(msg)
    X = bag_of_words(sentence, _all_words)
    X = X.reshape(1, X.shape[0])
    X = torch.from_numpy(X).to(device)

    output = _model(X)
    _, predicted = torch.max(output, dim=1)

    tag = _tags[predicted.item()]

    probs = torch.softmax(output, dim=1)
    prob = probs[0][predicted.item()]

    if prob.item() > 0.75:
        for intent in _intents['intents']:
            if tag == intent['tag']:
                response = random.choice(intent['responses'])
                if response == 'The time is: ':
                    return response + datetime.now().strftime('%H:%M:%S')
                if response == 'Todays date is ':
                    return response + date.today().strftime('%B %d, %Y')
                return response

    return 'I do not understand...'
