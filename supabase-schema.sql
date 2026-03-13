-- Run this SQL in your Supabase SQL Editor to create the tables

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  youtube_url TEXT,
  lyrics TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Vocabulary words table
CREATE TABLE IF NOT EXISTS vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  italian_word TEXT NOT NULL,
  english_translation TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow all access to songs" ON songs;
DROP POLICY IF EXISTS "Allow all access to vocabulary" ON vocabulary;

-- Create RLS policies for songs (users can only see their own songs)
CREATE POLICY "Users can view their own songs"
  ON songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own songs"
  ON songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own songs"
  ON songs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own songs"
  ON songs FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for vocabulary (users can only see vocab from their songs)
CREATE POLICY "Users can view vocabulary from their songs"
  ON vocabulary FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM songs
      WHERE songs.id = vocabulary.song_id
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vocabulary for their songs"
  ON vocabulary FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM songs
      WHERE songs.id = vocabulary.song_id
      AND songs.user_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS songs_user_id_idx ON songs(user_id);
CREATE INDEX IF NOT EXISTS songs_created_at_idx ON songs(created_at);
CREATE INDEX IF NOT EXISTS vocabulary_song_id_idx ON vocabulary(song_id);
