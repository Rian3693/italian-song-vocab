# 🎯 Setup Guide - Your Italian Vocabulary App

Hey Rian! I've built you the **complete Italian Song Vocabulary Builder** app. Here's everything you need to know.

---

## What You Got

A fully functional web app that:
1. Takes a YouTube URL of an Italian song
2. Automatically fetches the lyrics
3. Uses AI (GPT-4) to extract Italian vocabulary
4. Translates each word to English
5. Generates a summary of what the song is about
6. Creates Anki-style flashcards with spaced repetition
7. Tracks your progress over time

**Everything is automated** - you just paste the URL and start learning!

---

## 📂 All the Files I Created

```
italian-song-vocab/
├── package.json              # Project dependencies
├── README.md                 # Full documentation
├── setup.sh / setup.bat      # Auto-setup scripts
├── .env.local.example        # API keys template
│
├── db/
│   └── init.sql              # Database schema
│
├── lib/
│   ├── db.js                 # Database functions
│   ├── sm2.js                # Spaced repetition algorithm
│   └── youtube.js            # YouTube + lyrics integration
│
├── pages/
│   ├── _app.js               # Next.js app wrapper
│   ├── index.js              # Home page (paste URL here)
│   ├── song/[id].js          # Song details page
│   ├── review.js             # Flashcard review interface
│   └── api/
│       ├── extract-song.js   # Main processing API
│       └── review-card.js    # Review submission API
│
├── styles/
│   └── globals.css           # Tailwind CSS imports
│
├── tailwind.config.js        # Tailwind configuration
└── postcss.config.js         # PostCSS configuration
```

---

## 🚀 How to Get Started (Step-by-Step)

### Step 1: Navigate to the folder
```bash
cd italian-song-vocab
```

### Step 2: Run the auto-setup script

**On Windows:**
```bash
setup.bat
```

**On Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Check if Node.js and yt-dlp are installed
- Install all dependencies
- Create your `.env.local` file

### Step 3: Add your API keys

Open the `.env.local` file and add:

```
OPENAI_API_KEY=sk-...your-key-here
GENIUS_API_KEY=your-genius-key  # Optional
```

**Where to get them:**
- OpenAI: https://platform.openai.com/api-keys
- Genius (optional): https://genius.com/api-clients

### Step 4: Start the app
```bash
npm run dev
```

### Step 5: Open your browser
Go to: **http://localhost:3000**

---

## 🎵 How to Use

1. **Paste a YouTube URL** (e.g., `https://youtube.com/watch?v=...`)
2. Click **"Extract Vocabulary"**
3. Wait ~10-30 seconds while the AI processes everything
4. Click **"Start Learning"** to review flashcards
5. Rate each card:
   - **Again** → See it again soon
   - **Hard** → See it in ~10 minutes
   - **Good** → See it tomorrow
   - **Easy** → See it in 4+ days

The app uses the **SM-2 algorithm** (same as Anki) to optimize your review schedule.

---

## 💡 Example Songs to Try

- **Laura Pausini - La Solitudine**
  - https://youtube.com/watch?v=uCbLrYZmniU

- **Eros Ramazzotti - Più Bella Cosa**
  - https://youtube.com/watch?v=pnuFBnt2auo

- **Tiziano Ferro - Perdono**
  - https://youtube.com/watch?v=KTHzoCYxF2U

---

## 🛠️ Tech Stack (What I Used)

- **Next.js** - React framework (makes it easy to build and deploy)
- **TailwindCSS** - Beautiful styling
- **SQLite** - Local database (super fast, no setup needed)
- **OpenAI GPT-4** - Vocabulary extraction + summaries
- **yt-dlp** - YouTube metadata
- **Genius API** - Lyrics fetching (with Lyrics.ovh fallback)

---

## 📊 Cost Estimate

**Per song:**
- OpenAI API: ~$0.01 (1 cent)
- Genius API: Free
- Total: **~$0.01 per song**

If you process 100 songs, that's about **$1 total**.

---

## 🐛 Troubleshooting

### "yt-dlp not found"
Install it:
- **Windows:** `winget install yt-dlp`
- **Mac:** `brew install yt-dlp`
- **Linux:** See README.md

### "OpenAI API error"
- Check that your API key is correct in `.env.local`
- Make sure you have credits: https://platform.openai.com/usage

### "Lyrics not found"
- Some songs might not be on Genius or Lyrics.ovh
- Try searching for an official lyrics video on YouTube instead

---

## 🚀 Next Steps / Ideas for Expansion

Once you get comfortable with this, you could:
1. **Add audio pronunciation** (using TTS API)
2. **Import/export to Anki** (generate `.apkg` files)
3. **Add grammar explanations** (AI analyzes sentence structure)
4. **Multiplayer mode** (compete with friends on vocabulary)
5. **Mobile app** (convert to React Native)

---

## 🎓 Portfolio Value

This project is **perfect for your portfolio** because it shows:
- Full-stack development (frontend + backend + database)
- API integration (OpenAI, Genius, YouTube)
- AI/ML application (GPT-4 vocabulary extraction)
- Algorithm implementation (SM-2 spaced repetition)
- Real-world problem solving (language learning)

You can demo it in interviews: "I built an AI-powered language learning app that automatically creates flashcards from YouTube videos."

---

## 📝 Final Notes

- The database (`vocab.db`) will be created automatically on first run
- All your progress is saved locally
- You can add as many songs as you want
- The spaced repetition is fully automatic

**Enjoy learning Italian through music!** 🎵🇮🇹

If you run into any issues, check the main README.md or let me know! 🐾
