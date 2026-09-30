-- Umbra Studio v1.2.0 user profile foundation
-- Extends existing Umbra accounts with user-owned profile information.

CREATE TABLE IF NOT EXISTS studio_user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES studio_users(id) ON DELETE CASCADE,
  profile_image_url TEXT,
  personal_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
