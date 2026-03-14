-- Full schema update to restore all original features

-- Add missing columns to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'italian';

-- Create reviews table for spaced repetition
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL, -- 0-5 rating from SM-2 algorithm
  easiness FLOAT DEFAULT 2.5,
  interval INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
CREATE POLICY "Users can view their own reviews"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews(user_id);
CREATE INDEX IF NOT EXISTS reviews_vocabulary_id_idx ON reviews(vocabulary_id);
CREATE INDEX IF NOT EXISTS reviews_next_review_date_idx ON reviews(next_review_date);

-- Update vocabulary table to track if it's been studied
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS times_reviewed INTEGER DEFAULT 0;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE;
