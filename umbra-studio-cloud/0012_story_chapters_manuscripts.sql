-- Umbra Studio
-- Step 3A
-- Project -> Arc -> Chapter/Episode -> Scene -> Beat
-- Adds full manuscript storage for chapters and chapter-aware scenes.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS studio_story_chapters (
    id TEXT PRIMARY KEY,

    project_id TEXT
        REFERENCES studio_story_projects(id)
        ON DELETE CASCADE,

    arc_id TEXT
        REFERENCES studio_story_arcs(id)
        ON DELETE SET NULL,

    title TEXT NOT NULL,

    chapter_code TEXT,

    chapter_type TEXT NOT NULL DEFAULT 'chapter',

    summary TEXT,

    body_notes TEXT,

    sort_order INTEGER NOT NULL DEFAULT 0,

    status TEXT NOT NULL DEFAULT 'draft',

    canon_status TEXT NOT NULL DEFAULT 'draft',

    spoiler_level TEXT NOT NULL DEFAULT 'none',

    source_label TEXT,

    source_text TEXT,

    created_by TEXT,

    updated_by TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_story_chapters_project
ON studio_story_chapters(project_id);

CREATE INDEX IF NOT EXISTS idx_story_chapters_arc
ON studio_story_chapters(arc_id);

CREATE INDEX IF NOT EXISTS idx_story_chapters_order
ON studio_story_chapters(project_id,arc_id,sort_order);

ALTER TABLE studio_story_scenes
ADD COLUMN chapter_id TEXT
REFERENCES studio_story_chapters(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_story_scenes_chapter
ON studio_story_scenes(chapter_id);

