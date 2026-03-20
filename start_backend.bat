@echo off
echo =============================================
echo   VoxAI - Multilingual Voice Assistant
echo   Backend Startup Script
echo =============================================

cd /d "%~dp0backend"

:: Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate venv
call venv\Scripts\activate.bat

:: Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt --quiet

:: Check for .env file
if not exist ".env" (
    echo Creating .env from template...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Open backend\.env and add your MURF_API_KEY!
    echo.
    pause
)

:: Start Flask
echo.
echo 🚀 Starting Flask backend on http://localhost:5000
echo Press Ctrl+C to stop.
echo.
set FLASK_APP=app.py
set FLASK_ENV=development
python app.py

pause
