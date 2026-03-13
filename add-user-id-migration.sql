-- Add user_id column to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies
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

-- Create RLS policies for vocabulary
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

-- Create indexes
CREATE INDEX IF NOT EXISTS songs_user_id_idx ON songs(user_id);
CREATE INDEX IF NOT EXISTS songs_created_at_idx ON songs(created_at);
