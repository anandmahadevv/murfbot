# VoxAI Backend Service 🐍

Flask-based proxy service for the Murf AI integration. This handles secure API key management and audio streaming.

## Features
- **Secure Key Proxy**: Ensures `MURF_API_KEY` is never exposed to the client.
- **Audio Streaming Proxy**: Efficiently streams MP3 data in 16kb chunks.
- **Multilingual Detection**: Basic Unicode-based script detection.

## Setup
1. Create a `.env` file with `MURF_API_KEY`.
2. Install requirements: `pip install -r requirements.txt`.
3. Run: `python app.py`.

## API Endpoints
- `GET /api/health`: Service health check.
- `GET /api/voices`: Fetch available Murf Falcon voices.
- `POST /api/synthesize`: Convert text to a downloadable audio URL.
- `POST /api/synthesize/stream`: Stream audio directly for faster playback.
