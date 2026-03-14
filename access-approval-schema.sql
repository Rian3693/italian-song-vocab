-- Access approval table for Telegram code verification.
-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS user_access_approvals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  pending_code_hash TEXT,
  code_expires_at TIMESTAMP WITH TIME ZONE,
  last_requested_at TIMESTAMP WITH TIME ZONE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  approved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_access_approvals_approved_idx
  ON user_access_approvals(approved);

ALTER TABLE user_access_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no direct select approvals" ON user_access_approvals;
DROP POLICY IF EXISTS "no direct insert approvals" ON user_access_approvals;
DROP POLICY IF EXISTS "no direct update approvals" ON user_access_approvals;
DROP POLICY IF EXISTS "no direct delete approvals" ON user_access_approvals;

CREATE POLICY "no direct select approvals"
  ON user_access_approvals FOR SELECT
  USING (false);

CREATE POLICY "no direct insert approvals"
  ON user_access_approvals FOR INSERT
  WITH CHECK (false);

CREATE POLICY "no direct update approvals"
  ON user_access_approvals FOR UPDATE
  USING (false);

CREATE POLICY "no direct delete approvals"
  ON user_access_approvals FOR DELETE
  USING (false);
