# VoxAI – Multilingual AI Voice Assistant 🎙️

[![Murf AI](https://img.shields.io/badge/Powered%20By-Murf%20AI-blueviolet?style=for-the-badge&logo=openai)](https://murf.ai)
[![Vite](https://img.shields.io/badge/Built%20With-Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![Python/Flask](https://img.shields.io/badge/Backend-Python%2FFlask-3776AB?style=for-the-badge&logo=python)](https://flask.palletsprojects.com/)

A premium, real-time AI voice assistant demo powered by **Murf AI’s Falcon model**. Supporting ultra-low latency (<130ms) speech generation with seamless transition between **Hindi** and **English** (Hinglish) in a single sentence.

---

## ✨ Key Features

- **🚀 Falcon Engine Support**: Experience conversational AI with sub-130ms latency for a true real-time feel.
- **🇮🇳 Multilingual Mastery**: Switch between Hindi, English (US/IN), or mix both in the same sentence.
- **✨ Premium UI/UX**: Futuristic glassmorphism design with interactive particle systems and real-time audio waveforms.
- **🎤 Speech Recognition**: Supports speech-to-text (STT) for hands-free voice-to-voice interaction.
- **🌊 Low Latency Scaling**: Handle enterprise-grade concurrency via Murf's scalable API.
- **⚡ Pro Streaming Engine**: Real-time audio data streaming (16kb chunks) for ultra-fast playback.
- **🔒 Backend Secured**: API keys are managed safely in the environment, keeping them hidden from the client-side.

---

## 🛠️ Technology Stack

- **Frontend**: Vanilla ES6+, CSS3 Design System, HTML5, Vite.
- **Backend**: Python 3.9+, Flask, Requests, python-dotenv.
- **Visuals**: Canvas API (Particles & Audio Frequency Visualizer).
- **Communication**: REST API & Audio Streaming (proxied through backend).

---

## 🏃 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed.
- [Python 3.8+](https://www.python.org/) installed.
- **Murf AI API Key** (v1 with Falcon support).

### 2. Configuration
Copy the `.env.example` to `.env` in the backend folder and add your key:
```env
MURF_API_KEY=your_key_here
```

### 3. Installation
```powershell
# Install Node dependencies
npm install

# Install Python backend dependencies
pip install -r backend/requirements.txt
```

### 4. Run the Dev Server
```powershell
# Starts both frontend (port 3000) and backend (port 5000)
npm start
```
Visit app at: **[http://localhost:3000](http://localhost:3000)**

### 💡 Troubleshooting
- **API Errors**: If synthesis fails, verify your Murf AI quota. Falcon models require specific v1 API keys.
- **CORS Issues**: Ensure the backend (5000) and frontend (3000) are both running if you aren't using the Vite proxy.
- **Python requirements**: Run `pip install -r backend/requirements.txt` to resolve missing `flask` or `requests` modules.

---

## 📂 Project Structure

```text
├── backend/
│   ├── app.py           # Flask Backend Proxy
│   ├── requirements.txt # Python Dependencies
│   └── .env             # Secure Environment (Hidden)
├── frontend/
│   ├── index.html       # Main UI Layout
│   ├── style.css        # Premium Design System
│   └── app.js           # Core Application Logic
├── package.json         # Scripts and Dev Tools
└── vite.config.js       # Proxy configuration
```

---

## 🎯 Hackathon Objective
This project was developed for the **Murf AI Hackathon** to demonstrate the feasibility of ultra-fast multilingual AI assistants in the Indian market, bridging the gap for the "next billion users" through voice.

---

## 🚀 Next Steps
- [ ] **Conversational Memory**: Add Redis/Database support for session-based AI memory.
- [ ] **Streaming Transcription**: Implement WebSockets for real-time speech feedback.
- [ ] **Advanced Voice Cloning**: Use Murf's premium voice cloning for personalized UX.

---
*Created by [Anand Mahadev](https://github.com/anandmahadev) for Murf AI Hackathon 2026.*
