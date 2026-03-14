-- Limits account creation to a maximum number per IP hash.
-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS signup_ip_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- One log row per user account.
CREATE UNIQUE INDEX IF NOT EXISTS signup_ip_limits_user_id_uidx
  ON signup_ip_limits(user_id);

-- Fast lookup by IP hash.
CREATE INDEX IF NOT EXISTS signup_ip_limits_ip_hash_idx
  ON signup_ip_limits(ip_hash);

ALTER TABLE signup_ip_limits ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table from app code.
-- These policies deny direct client access.
DROP POLICY IF EXISTS "no direct select" ON signup_ip_limits;
DROP POLICY IF EXISTS "no direct insert" ON signup_ip_limits;
DROP POLICY IF EXISTS "no direct update" ON signup_ip_limits;
DROP POLICY IF EXISTS "no direct delete" ON signup_ip_limits;

CREATE POLICY "no direct select"
  ON signup_ip_limits FOR SELECT
  USING (false);

CREATE POLICY "no direct insert"
  ON signup_ip_limits FOR INSERT
  WITH CHECK (false);

CREATE POLICY "no direct update"
  ON signup_ip_limits FOR UPDATE
  USING (false);

CREATE POLICY "no direct delete"
  ON signup_ip_limits FOR DELETE
  USING (false);
