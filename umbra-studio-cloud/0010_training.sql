CREATE TABLE IF NOT EXISTS studio_training_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  resource_url TEXT,
  resource_name TEXT,
  created_by TEXT NOT NULL REFERENCES studio_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS studio_training_assignments (
  id TEXT PRIMARY KEY,
  training_id TEXT NOT NULL REFERENCES studio_training_items(id) ON DELETE CASCADE,
  assigned_to TEXT NOT NULL REFERENCES studio_users(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL REFERENCES studio_users(id),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK(status IN ('not_started','in_progress','completed')),
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  UNIQUE(training_id, assigned_to)
);

CREATE INDEX IF NOT EXISTS idx_training_assignments_user
ON studio_training_assignments(assigned_to);

CREATE INDEX IF NOT EXISTS idx_training_assignments_training
ON studio_training_assignments(training_id);

CREATE INDEX IF NOT EXISTS idx_training_assignments_status
ON studio_training_assignments(status);