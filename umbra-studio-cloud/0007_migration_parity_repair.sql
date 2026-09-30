-- Umbra Studio v1.1.0 migration parity repair
-- Adds audit/ownership columns used by the Cloudflare Worker that were present
-- in the application behavior but omitted from the initial D1 schema.

ALTER TABLE studio_world_relations ADD COLUMN owner_user_id TEXT;

ALTER TABLE studio_character_journey ADD COLUMN created_by TEXT;

ALTER TABLE studio_review_comments ADD COLUMN resolved_by TEXT;

ALTER TABLE studio_continuity_issues ADD COLUMN resolved_by TEXT;
ALTER TABLE studio_continuity_issues ADD COLUMN resolved_at TEXT;

ALTER TABLE studio_public_settings ADD COLUMN updated_by TEXT;
