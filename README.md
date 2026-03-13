# 🎵 Italian Song Vocabulary

Learn Italian through music! This app extracts vocabulary from Italian songs on YouTube using AI.

## Setup Instructions

### 1. Database Setup (Supabase)

1. Go to your Supabase dashboard: https://cqwidmqxlibjbbdjplfh.supabase.co
2. Click on the **SQL Editor** (left sidebar)
3. Copy and paste the entire contents of `supabase-schema.sql` 
4. Click **Run** to create the tables

### 2. Environment Variables

Make sure your `.env` file has all the required keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://cqwidmqxlibjbbdjplfh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_full_publishable_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

**To get your OpenAI API key:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy it and paste it into `.env`

### 3. Install Dependencies

Already done! But if you need to reinstall:
```bash
npm install
```

### 4. Run the App

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

## How to Use

1. **Add a song:** Paste a YouTube URL of an Italian song
2. **Wait for processing:** The app will:
   - Extract the song title and artist
   - Get the lyrics (you may need to paste them manually for now)
   - Use AI to identify 15-20 useful vocabulary words
   - Save everything to your database
3. **Study:** Click on any song to see its vocabulary with translations

## Features

- ✅ YouTube integration
- ✅ AI-powered vocabulary extraction
- ✅ English translations
- ✅ Context from lyrics
- ✅ Beautiful UI with Tailwind CSS
- ✅ Database storage with Supabase

## Next Steps

### Improve Lyrics Extraction
The current lyrics fetching is basic. Consider integrating a proper API:
- [Genius API](https://docs.genius.com/)
- [Musixmatch API](https://developer.musixmatch.com/)

### Add Features
- Export vocabulary to flashcards
- Quiz mode
- Audio pronunciation
- User authentication
- Difficulty levels

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI GPT-4
- **Other:** Axios, Cheerio, YouTube data extraction

---

**Enjoy learning Italian through music! 🇮🇹🎶**
