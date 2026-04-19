"""
Global Configuration Constants for VoxAI
Defines voice mappings, API endpoints, and system-wide limits.
"""
from typing import Dict, Any

# Primary voice selection map structured by locale and gender
VOICE_OPTIONS: Dict[str, Dict[str, Dict[str, str]]] = {
    "en-US": {
        "female": {"voiceId": "en-US-natalie", "name": "Natalie (English US - Female)"},
        "male":   {"voiceId": "en-US-marcus",  "name": "Marcus (English US - Male)"},
    },
    "en-IN": {
        "female": {"voiceId": "en-IN-isha",    "name": "Isha (English India - Female)"},
        "male":   {"voiceId": "en-IN-arjun",   "name": "Arjun (English India - Male)"},
    },
    "hi-IN": {
        "female": {"voiceId": "hi-IN-divya",   "name": "Divya (Hindi - Female)"},
        "male":   {"voiceId": "hi-IN-aryan",   "name": "Aryan (Hindi - Male)"},
    },
}

API_VERSION = "v1"
MURF_BASE_URL = f"https://api.murf.ai/{API_VERSION}"
DEFAULT_MODEL = "FALCON"
MAX_TEXT_LENGTH = 3000
