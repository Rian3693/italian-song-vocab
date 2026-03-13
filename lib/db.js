const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'vocab-data.json');

// Initialize database
let db = {
  songs: [],
  flashcards: [],
  reviews: [],
  settings: { dailyNewWordsLimit: 15, selectedLanguage: 'italian' }
};

// Load existing data if it exists
if (fs.existsSync(dbPath)) {
  try {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) {
    console.log('Creating new database...');
  }
}

// Save database to file
function saveDB() {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

const normalizeLanguage = (language) => {
  return language === 'spanish' ? 'spanish' : 'italian';
};

// Song operations
const saveSong = (youtubeUrl, title, artist, lyrics, summary, language = 'italian') => {
  const normalizedLanguage = normalizeLanguage(language);
  const existing = db.songs.find(
    s => s.youtube_url === youtubeUrl && (s.language || 'italian') === normalizedLanguage
  );
  if (existing) {
    existing.title = title;
    existing.lyrics = lyrics;
    existing.summary = summary;
    existing.language = normalizedLanguage;
    saveDB();
    return existing.id;
  }
  
  const id = db.songs.length + 1;
  db.songs.push({
    id,
    youtube_url: youtubeUrl,
    title,
    artist,
    lyrics,
    summary,
    language: normalizedLanguage,
    created_at: new Date().toISOString()
  });
  saveDB();
  return id;
};

const getSong = (id) => {
  return db.songs.find(s => s.id === parseInt(id));
};

const getAllSongs = () => {
  return db.songs.map(s => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    language: s.language || 'italian',
    created_at: s.created_at
  })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

// Flashcard operations
const saveFlashcards = (songId, cards, language = 'italian') => {
  const normalizedLanguage = normalizeLanguage(language);
  for (const card of cards) {
    const id = db.flashcards.length + 1;
    db.flashcards.push({
      id,
      song_id: songId,
      italian: card.italian,
      english: card.english,
      example_sentence: card.example || '',
      example_english: card.example_english || '',
      ai_example: card.ai_example || '',
      ai_example_english: card.ai_example_english || '',
      language: card.language || normalizedLanguage,
      next_review: new Date().toISOString(),
      repetitions: 0,
      ease_factor: 2.5,
      interval: 0
    });
  }
  saveDB();
};

const getFlashcardsBySong = (songId) => {
  return db.flashcards.filter(f => f.song_id === parseInt(songId));
};

const getAllFlashcards = () => {
  return db.flashcards.sort((a, b) => b.id - a.id);
};

const updateFlashcard = (id, repetitions, easeFactor, interval, nextReview) => {
  const card = db.flashcards.find(f => f.id === parseInt(id));
  if (card) {
    const isNew = card.repetitions === 0;
    card.repetitions = repetitions;
    card.ease_factor = easeFactor;
    card.interval = interval;
    card.next_review = nextReview;
    
    // Log the review
    logReview(isNew);
    
    saveDB();
  }
};

// Review history tracking
const logReview = (isNew = false) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  if (!db.reviews) db.reviews = [];
  const existingReview = db.reviews.find(r => r.date === today);
  
  if (existingReview) {
    existingReview.count += 1;
    if (isNew) {
      existingReview.new_words = (existingReview.new_words || 0) + 1;
    }
  } else {
    db.reviews.push({
      date: today,
      count: 1,
      new_words: isNew ? 1 : 0
    });
  }
};

const getReviewStats = () => {
  if (!db.reviews) db.reviews = [];
  
  // Calculate total reviews
  const totalReviews = db.reviews.reduce((sum, r) => sum + r.count, 0);
  
  // Calculate current streak
  let streak = 0;
  const sortedDates = db.reviews.map(r => r.date).sort().reverse();
  let currentDate = new Date();
  currentDate.setHours(0,0,0,0);
  
  for (const reviewDate of sortedDates) {
    const date = new Date(reviewDate);
    date.setHours(0,0,0,0);
    const diffTime = Math.abs(currentDate - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === streak) {
      streak++;
    } else {
      break;
    }
  }
  
  // Get today's reviews
  const today = new Date().toISOString().split('T')[0];
  const todayReview = db.reviews.find(r => r.date === today);
  const reviewsToday = todayReview ? todayReview.count : 0;
  const newWordsToday = todayReview ? (todayReview.new_words || 0) : 0;
  
  // Get reviews by date for heatmap
  const reviewsByDate = {};
  db.reviews.forEach(r => {
    reviewsByDate[r.date] = r.count;
  });
  
  return {
    totalReviews,
    streak,
    reviewsToday,
    newWordsToday,
    totalCards: db.flashcards.length,
    reviewsByDate
  };
};

const getDailyNewWordsLimit = () => {
  return db.settings?.dailyNewWordsLimit || 15;
};

const setDailyNewWordsLimit = (limit) => {
  if (!db.settings) db.settings = {};
  db.settings.dailyNewWordsLimit = parseInt(limit);
  saveDB();
};

const getSelectedLanguage = () => {
  return normalizeLanguage(db.settings?.selectedLanguage);
};

const setSelectedLanguage = (language) => {
  if (!db.settings) db.settings = {};
  db.settings.selectedLanguage = normalizeLanguage(language);
  saveDB();
};

const getDueFlashcards = (limit = 20, language = null) => {
  const now = new Date();
  const today = new Date().toISOString().split('T')[0];
  if (!db.reviews) db.reviews = [];
  const todayReview = db.reviews.find(r => r.date === today);
  const newWordsToday = todayReview ? (todayReview.new_words || 0) : 0;
  const newWordsLimit = getDailyNewWordsLimit();
  
  const allDue = db.flashcards
    .filter(f => new Date(f.next_review) <= now)
    .map(f => {
      const song = getSong(f.song_id);
      return {
        ...f,
        language: f.language || (song?.language || 'italian'),
        song_title: song ? song.title : 'Unknown'
      };
    });

  const normalizedFilter = language === 'spanish' ? 'spanish' : (language === 'italian' ? 'italian' : null);
  const filteredDue = normalizedFilter
    ? allDue.filter(f => (f.language || 'italian') === normalizedFilter)
    : allDue;

  // Split into old and new
  const oldCards = filteredDue.filter(f => f.repetitions > 0);
  const newCards = filteredDue.filter(f => f.repetitions === 0);
  
  // Apply new word limit
  const allowedNewCount = Math.max(0, newWordsLimit - newWordsToday);
  const limitedNewCards = newCards.slice(0, allowedNewCount);
  
  return [...oldCards, ...limitedNewCards].slice(0, limit);
};

module.exports = {
  saveSong,
  getSong,
  getAllSongs,
  saveFlashcards,
  getFlashcardsBySong,
  getDueFlashcards,
  updateFlashcard,
  getReviewStats,
  getAllFlashcards,
  getDailyNewWordsLimit,
  setDailyNewWordsLimit,
  getSelectedLanguage,
  setSelectedLanguage
};
