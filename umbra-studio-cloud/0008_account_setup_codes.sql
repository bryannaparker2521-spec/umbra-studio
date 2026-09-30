CREATE TABLE IF NOT EXISTS studio_account_setup_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_studio_account_setup_codes_user ON studio_account_setup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_account_setup_codes_hash ON studio_account_setup_codes(code_hash);
