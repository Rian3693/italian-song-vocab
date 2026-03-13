#!/bin/bash

echo "🎵 Setting up Italian Song Vocab Builder..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if yt-dlp is installed
if ! command -v yt-dlp &> /dev/null; then
    echo "⚠️  yt-dlp is not installed."
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install yt-dlp"
    echo "  Windows: winget install yt-dlp"
    echo "  Linux:   sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp"
    echo ""
else
    echo "✅ yt-dlp detected"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo ""
    echo "📝 Creating .env.local file..."
    cp .env.local.example .env.local
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.local and add your API keys:"
    echo "   - OPENAI_API_KEY (required)"
    echo "   - GENIUS_API_KEY (optional)"
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "To start the app:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser!"
