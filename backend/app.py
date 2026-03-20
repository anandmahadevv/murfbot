from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["*"])

MURF_API_KEY = os.environ.get("MURF_API_KEY", "")
MURF_BASE_URL = "https://api.murf.ai/v1"

def get_headers(request_key=None):
    key = request_key or MURF_API_KEY
    return {
        "api-key": key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

# Voice configurations for Hindi and English
VOICE_OPTIONS = {
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


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok", 
        "service": "Murf AI Voice Assistant Backend",
        "apiKeyConfigured": bool(MURF_API_KEY)
    })


@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify({
        "apiKeyConfigured": bool(MURF_API_KEY)
    })


@app.route("/api/voices", methods=["GET"])
def get_voices():
    """Fetch available Falcon voices from Murf API"""
    try:
        request_key = request.headers.get("X-Murf-Key")
        response = requests.get(
            f"{MURF_BASE_URL}/speech/voices?model=FALCON",
            headers=get_headers(request_key),
            timeout=10
        )
        if response.status_code == 200:
            voices = response.json()
            # Filter for English and Hindi voices
            filtered = []
            for v in voices:
                locale = v.get("locale", "")
                if locale.startswith("en-") or locale.startswith("hi-"):
                    filtered.append({
                        "voiceId":     v.get("voiceId"),
                        "name":        v.get("displayName", v.get("voiceId")),
                        "locale":      locale,
                        "gender":      v.get("gender", "FEMALE"),
                        "supportedLocales": v.get("supportedLocales", []),
                    })
            return jsonify({"voices": filtered, "total": len(filtered)})
        else:
            # Return curated fallback voice list
            return jsonify({"voices": get_fallback_voices(), "total": 6, "source": "fallback"})
    except Exception as e:
        return jsonify({"voices": get_fallback_voices(), "total": 6, "source": "fallback", "error": str(e)})


def get_fallback_voices():
    voices = []
    for locale, genders in VOICE_OPTIONS.items():
        for gender, info in genders.items():
            voices.append({
                "voiceId": info["voiceId"],
                "name":    info["name"],
                "locale":  locale,
                "gender":  gender.upper(),
                "supportedLocales": [locale],
            })
    return voices


@app.route("/api/synthesize", methods=["POST"])
def synthesize():
    """Convert text to speech using Murf AI API"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    text     = data.get("text", "").strip()
    voice_id = data.get("voiceId", "en-US-natalie")
    language = data.get("language", "en-US")
    model    = data.get("model", "GEN2")  # GEN2 or FALCON
    style    = data.get("style", "Conversational")

    if not text:
        return jsonify({"error": "Text is required"}), 400
    if len(text) > 3000:
        return jsonify({"error": "Text too long (max 3000 characters)"}), 400

    payload = {
        "text":       text,
        "voiceId":    voice_id,
        "style":      style,
        "rate":       0,
        "pitch":      0,
        "sampleRate": 24000,
        "format":     "MP3",
        "channelType": "MONO",
        "modelVersion": model,
    }

    # For multilingual (Hindi + English mix), enable multiNativeLocale
    if language == "multilingual":
        payload["multiNativeLocale"] = "hi-IN"

    try:
        request_key = request.headers.get("X-Murf-Key")
        response = requests.post(
            f"{MURF_BASE_URL}/speech/generate",
            headers=get_headers(request_key),
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            audio_url = result.get("audioFile") or result.get("audio_file") or result.get("url")
            return jsonify({
                "success":   True,
                "audioUrl":  audio_url,
                "voiceId":   voice_id,
                "language":  language,
                "textLength": len(text),
            })
        else:
            err_detail = {}
            try:
                err_detail = response.json()
            except Exception:
                err_detail = {"raw": response.text}
            return jsonify({
                "error":    f"Murf API error: {response.status_code}",
                "detail":   err_detail
            }), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timed out. Please try again."}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot connect to Murf API. Check your internet connection."}), 503
    except Exception as e:
        return jsonify({"error": f"Internal error: {str(e)}"}), 500


@app.route("/api/synthesize/stream", methods=["POST"])
def synthesize_stream():
    """Stream audio using Murf AI Falcon model's streaming endpoint"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body"}), 400

    text     = data.get("text", "").strip()
    voice_id = data.get("voiceId", "en-US-natalie")
    language = data.get("language", "en-US")

    if not text:
        return jsonify({"error": "Text is required"}), 400

    payload = {
        "text":             text,
        "voiceId":          voice_id,
        "format":           "MP3",
        "model":            "FALCON",
        "sampleRate":       24000,
    }

    if language == "multilingual":
        payload["multiNativeLocale"] = "hi-IN"

    request_key = request.headers.get("X-Murf-Key")
    stream_headers = get_headers(request_key)
    stream_headers["Accept"] = "audio/mpeg"

    try:
        resp = requests.post(
            f"{MURF_BASE_URL}/speech/stream",
            headers=stream_headers,
            json=payload,
            stream=True,
            timeout=30
        )

        if resp.status_code == 200:
            def generate():
                for chunk in resp.iter_content(chunk_size=4096):
                    if chunk:
                        yield chunk

            return Response(
                stream_with_context(generate()),
                content_type="audio/mpeg",
                headers={"X-Accel-Buffering": "no"}
            )
        else:
            return jsonify({"error": f"Stream error: {resp.status_code}", "detail": resp.text}), resp.status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/detect-language", methods=["POST"])
def detect_language():
    """Simple server-side language detection"""
    data = request.get_json()
    text = data.get("text", "")

    # Hindi Unicode range detection
    hindi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    total_alpha = sum(1 for c in text if c.isalpha())

    if total_alpha == 0:
        detected = "en-US"
    elif hindi_chars / max(total_alpha, 1) > 0.5:
        detected = "hi-IN"
    elif hindi_chars > 0:
        detected = "multilingual"
    else:
        detected = "en-US"

    return jsonify({"detected": detected, "hindiRatio": hindi_chars / max(total_alpha, 1)})


if __name__ == "__main__":
    print("Murf AI Voice Assistant Backend starting...")
    print(f"   API Key configured: {'YES' if MURF_API_KEY != 'YOUR_MURF_API_KEY_HERE' else 'NO - set MURF_API_KEY env var'}")
    app.run(host="0.0.0.0", port=5000, debug=True)
