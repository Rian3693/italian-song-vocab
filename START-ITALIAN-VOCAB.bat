@echo off
echo.
echo ========================================
echo   Starting Italian Song Vocab App
echo ========================================
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:3000
echo.
echo Starting development server...
echo (Keep this window open while using the app)
echo Press Ctrl+C to stop the server
echo.
npm run dev
