@echo off
echo =============================================
echo   VoxAI - Opening Frontend in Browser
echo =============================================

set FRONTEND_PATH=%~dp0frontend\index.html

echo Opening: %FRONTEND_PATH%
start "" "%FRONTEND_PATH%"

echo.
echo ✅ Frontend opened in your default browser!
echo 📝 Make sure the backend is running on http://localhost:5000
echo.
