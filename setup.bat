@echo off
echo 🎵 Setting up Italian Song Vocab Builder...
echo.

:: Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install it from https://nodejs.org/
    exit /b 1
)
echo ✅ Node.js detected

:: Check if yt-dlp is installed
yt-dlp --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  yt-dlp is not installed.
    echo.
    echo Install it with: winget install yt-dlp
    echo.
) else (
    echo ✅ yt-dlp detected
)

:: Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

:: Create .env.local if it doesn't exist
if not exist .env.local (
    echo.
    echo 📝 Creating .env.local file...
    copy .env.local.example .env.local
    echo.
    echo ⚠️  IMPORTANT: Edit .env.local and add your API keys:
    echo    - OPENAI_API_KEY (required)
    echo    - GENIUS_API_KEY (optional)
    echo.
)

echo ✅ Setup complete!
echo.
echo To start the app:
echo   npm run dev
echo.
echo Then open http://localhost:3000 in your browser!
pause
