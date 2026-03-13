-- Initialize SQLite database for Italian vocabulary learning

CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  lyrics TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flashcards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id INTEGER NOT NULL,
  italian TEXT NOT NULL,
  english TEXT NOT NULL,
  example_sentence TEXT,
  next_review TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  repetitions INTEGER DEFAULT 0,
  ease_factor REAL DEFAULT 2.5,
  interval INTEGER DEFAULT 0,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flashcards_review ON flashcards(next_review);
CREATE INDEX IF NOT EXISTS idx_flashcards_song ON flashcards(song_id);
