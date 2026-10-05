-- v1.3.0: canonical import history, per-user review and unique entity slugs.
CREATE TABLE IF NOT EXISTS studio_import_results(
 id TEXT PRIMARY KEY,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,
 title TEXT NOT NULL,action TEXT NOT NULL CHECK(action IN ('created','updated')),
 imported_at TEXT NOT NULL,imported_by TEXT NOT NULL,batch_id TEXT NOT NULL,
 category TEXT NOT NULL,UNIQUE(entity_type,entity_id));
CREATE TABLE IF NOT EXISTS studio_import_reviews(
 import_id TEXT NOT NULL REFERENCES studio_import_results(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL,reviewed_at TEXT NOT NULL,PRIMARY KEY(import_id,user_id));
CREATE TABLE IF NOT EXISTS studio_entity_slugs(
 entity_type TEXT NOT NULL,slug TEXT NOT NULL,entity_id TEXT NOT NULL,
 PRIMARY KEY(entity_type,slug),UNIQUE(entity_type,entity_id));
CREATE INDEX IF NOT EXISTS idx_import_results_time ON studio_import_results(imported_at DESC);

CREATE TRIGGER IF NOT EXISTS v130_delete_character AFTER DELETE ON studio_characters BEGIN
DELETE FROM studio_favorites WHERE entity_type IN ('character') AND entity_id=OLD.id;
DELETE FROM studio_collection_items WHERE entity_type IN ('character') AND entity_id=OLD.id;
DELETE FROM studio_tag_assignments WHERE entity_type IN ('character') AND entity_id=OLD.id;
DELETE FROM studio_media_attachments WHERE entity_type IN ('character') AND entity_id=OLD.id;
DELETE FROM studio_review_comments WHERE entity_type IN ('character') AND entity_id=OLD.id;
DELETE FROM studio_assignments WHERE entity_type IN ('character') AND entity_id=OLD.id;
DELETE FROM studio_universal_links WHERE (source_type IN ('character') AND source_id=OLD.id) OR (target_type IN ('character') AND target_id=OLD.id);
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('character') AND story_entity_id=OLD.id) OR (linked_entity_type IN ('character') AND linked_entity_id=OLD.id);
DELETE FROM studio_import_results WHERE entity_type='character' AND entity_id=OLD.id;
DELETE FROM studio_entity_slugs WHERE entity_type='character' AND entity_id=OLD.id;
END;
DELETE FROM studio_favorites WHERE entity_type IN ('character') AND NOT EXISTS(SELECT 1 FROM studio_characters WHERE id=studio_favorites.entity_id);
DELETE FROM studio_collection_items WHERE entity_type IN ('character') AND NOT EXISTS(SELECT 1 FROM studio_characters WHERE id=studio_collection_items.entity_id);
DELETE FROM studio_tag_assignments WHERE entity_type IN ('character') AND NOT EXISTS(SELECT 1 FROM studio_characters WHERE id=studio_tag_assignments.entity_id);
DELETE FROM studio_media_attachments WHERE entity_type IN ('character') AND NOT EXISTS(SELECT 1 FROM studio_characters WHERE id=studio_media_attachments.entity_id);
DELETE FROM studio_universal_links WHERE (source_type IN ('character') AND NOT EXISTS(SELECT 1 FROM studio_characters WHERE id=studio_universal_links.source_id)) OR (target_type IN ('character') AND NOT EXISTS(SELECT 1 FROM studio_characters WHERE id=studio_universal_links.target_id));
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('character') AND NOT EXISTS(SELECT 1 FROM studio_characters WHERE id=studio_story_entity_links.story_entity_id)) OR (linked_entity_type IN ('character') AND NOT EXISTS(SELECT 1 FROM studio_characters WHERE id=studio_story_entity_links.linked_entity_id));

CREATE TRIGGER IF NOT EXISTS v130_delete_codex AFTER DELETE ON studio_world_records BEGIN
DELETE FROM studio_favorites WHERE entity_type IN ('codex','world','world_record') AND entity_id=OLD.id;
DELETE FROM studio_collection_items WHERE entity_type IN ('codex','world','world_record') AND entity_id=OLD.id;
DELETE FROM studio_tag_assignments WHERE entity_type IN ('codex','world','world_record') AND entity_id=OLD.id;
DELETE FROM studio_media_attachments WHERE entity_type IN ('codex','world','world_record') AND entity_id=OLD.id;
DELETE FROM studio_review_comments WHERE entity_type IN ('codex','world','world_record') AND entity_id=OLD.id;
DELETE FROM studio_assignments WHERE entity_type IN ('codex','world','world_record') AND entity_id=OLD.id;
DELETE FROM studio_universal_links WHERE (source_type IN ('codex','world','world_record') AND source_id=OLD.id) OR (target_type IN ('codex','world','world_record') AND target_id=OLD.id);
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('codex','world','world_record') AND story_entity_id=OLD.id) OR (linked_entity_type IN ('codex','world','world_record') AND linked_entity_id=OLD.id);
DELETE FROM studio_import_results WHERE entity_type='codex' AND entity_id=OLD.id;
DELETE FROM studio_entity_slugs WHERE entity_type='codex' AND entity_id=OLD.id;
END;
DELETE FROM studio_favorites WHERE entity_type IN ('codex','world','world_record') AND NOT EXISTS(SELECT 1 FROM studio_world_records WHERE id=studio_favorites.entity_id);
DELETE FROM studio_collection_items WHERE entity_type IN ('codex','world','world_record') AND NOT EXISTS(SELECT 1 FROM studio_world_records WHERE id=studio_collection_items.entity_id);
DELETE FROM studio_tag_assignments WHERE entity_type IN ('codex','world','world_record') AND NOT EXISTS(SELECT 1 FROM studio_world_records WHERE id=studio_tag_assignments.entity_id);
DELETE FROM studio_media_attachments WHERE entity_type IN ('codex','world','world_record') AND NOT EXISTS(SELECT 1 FROM studio_world_records WHERE id=studio_media_attachments.entity_id);
DELETE FROM studio_universal_links WHERE (source_type IN ('codex','world','world_record') AND NOT EXISTS(SELECT 1 FROM studio_world_records WHERE id=studio_universal_links.source_id)) OR (target_type IN ('codex','world','world_record') AND NOT EXISTS(SELECT 1 FROM studio_world_records WHERE id=studio_universal_links.target_id));
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('codex','world','world_record') AND NOT EXISTS(SELECT 1 FROM studio_world_records WHERE id=studio_story_entity_links.story_entity_id)) OR (linked_entity_type IN ('codex','world','world_record') AND NOT EXISTS(SELECT 1 FROM studio_world_records WHERE id=studio_story_entity_links.linked_entity_id));

CREATE TRIGGER IF NOT EXISTS v130_delete_location AFTER DELETE ON studio_world_locations BEGIN
DELETE FROM studio_favorites WHERE entity_type IN ('location','world_location') AND entity_id=OLD.id;
DELETE FROM studio_collection_items WHERE entity_type IN ('location','world_location') AND entity_id=OLD.id;
DELETE FROM studio_tag_assignments WHERE entity_type IN ('location','world_location') AND entity_id=OLD.id;
DELETE FROM studio_media_attachments WHERE entity_type IN ('location','world_location') AND entity_id=OLD.id;
DELETE FROM studio_review_comments WHERE entity_type IN ('location','world_location') AND entity_id=OLD.id;
DELETE FROM studio_assignments WHERE entity_type IN ('location','world_location') AND entity_id=OLD.id;
DELETE FROM studio_universal_links WHERE (source_type IN ('location','world_location') AND source_id=OLD.id) OR (target_type IN ('location','world_location') AND target_id=OLD.id);
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('location','world_location') AND story_entity_id=OLD.id) OR (linked_entity_type IN ('location','world_location') AND linked_entity_id=OLD.id);
DELETE FROM studio_import_results WHERE entity_type='location' AND entity_id=OLD.id;
DELETE FROM studio_entity_slugs WHERE entity_type='location' AND entity_id=OLD.id;
END;
DELETE FROM studio_favorites WHERE entity_type IN ('location','world_location') AND NOT EXISTS(SELECT 1 FROM studio_world_locations WHERE id=studio_favorites.entity_id);
DELETE FROM studio_collection_items WHERE entity_type IN ('location','world_location') AND NOT EXISTS(SELECT 1 FROM studio_world_locations WHERE id=studio_collection_items.entity_id);
DELETE FROM studio_tag_assignments WHERE entity_type IN ('location','world_location') AND NOT EXISTS(SELECT 1 FROM studio_world_locations WHERE id=studio_tag_assignments.entity_id);
DELETE FROM studio_media_attachments WHERE entity_type IN ('location','world_location') AND NOT EXISTS(SELECT 1 FROM studio_world_locations WHERE id=studio_media_attachments.entity_id);
DELETE FROM studio_universal_links WHERE (source_type IN ('location','world_location') AND NOT EXISTS(SELECT 1 FROM studio_world_locations WHERE id=studio_universal_links.source_id)) OR (target_type IN ('location','world_location') AND NOT EXISTS(SELECT 1 FROM studio_world_locations WHERE id=studio_universal_links.target_id));
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('location','world_location') AND NOT EXISTS(SELECT 1 FROM studio_world_locations WHERE id=studio_story_entity_links.story_entity_id)) OR (linked_entity_type IN ('location','world_location') AND NOT EXISTS(SELECT 1 FROM studio_world_locations WHERE id=studio_story_entity_links.linked_entity_id));

CREATE TRIGGER IF NOT EXISTS v130_delete_timeline AFTER DELETE ON studio_timeline_events BEGIN
DELETE FROM studio_favorites WHERE entity_type IN ('timeline','event','timeline_event') AND entity_id=OLD.id;
DELETE FROM studio_collection_items WHERE entity_type IN ('timeline','event','timeline_event') AND entity_id=OLD.id;
DELETE FROM studio_tag_assignments WHERE entity_type IN ('timeline','event','timeline_event') AND entity_id=OLD.id;
DELETE FROM studio_media_attachments WHERE entity_type IN ('timeline','event','timeline_event') AND entity_id=OLD.id;
DELETE FROM studio_review_comments WHERE entity_type IN ('timeline','event','timeline_event') AND entity_id=OLD.id;
DELETE FROM studio_assignments WHERE entity_type IN ('timeline','event','timeline_event') AND entity_id=OLD.id;
DELETE FROM studio_universal_links WHERE (source_type IN ('timeline','event','timeline_event') AND source_id=OLD.id) OR (target_type IN ('timeline','event','timeline_event') AND target_id=OLD.id);
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('timeline','event','timeline_event') AND story_entity_id=OLD.id) OR (linked_entity_type IN ('timeline','event','timeline_event') AND linked_entity_id=OLD.id);
DELETE FROM studio_import_results WHERE entity_type='timeline' AND entity_id=OLD.id;
DELETE FROM studio_entity_slugs WHERE entity_type='timeline' AND entity_id=OLD.id;
END;
DELETE FROM studio_favorites WHERE entity_type IN ('timeline','event','timeline_event') AND NOT EXISTS(SELECT 1 FROM studio_timeline_events WHERE id=studio_favorites.entity_id);
DELETE FROM studio_collection_items WHERE entity_type IN ('timeline','event','timeline_event') AND NOT EXISTS(SELECT 1 FROM studio_timeline_events WHERE id=studio_collection_items.entity_id);
DELETE FROM studio_tag_assignments WHERE entity_type IN ('timeline','event','timeline_event') AND NOT EXISTS(SELECT 1 FROM studio_timeline_events WHERE id=studio_tag_assignments.entity_id);
DELETE FROM studio_media_attachments WHERE entity_type IN ('timeline','event','timeline_event') AND NOT EXISTS(SELECT 1 FROM studio_timeline_events WHERE id=studio_media_attachments.entity_id);
DELETE FROM studio_universal_links WHERE (source_type IN ('timeline','event','timeline_event') AND NOT EXISTS(SELECT 1 FROM studio_timeline_events WHERE id=studio_universal_links.source_id)) OR (target_type IN ('timeline','event','timeline_event') AND NOT EXISTS(SELECT 1 FROM studio_timeline_events WHERE id=studio_universal_links.target_id));
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('timeline','event','timeline_event') AND NOT EXISTS(SELECT 1 FROM studio_timeline_events WHERE id=studio_story_entity_links.story_entity_id)) OR (linked_entity_type IN ('timeline','event','timeline_event') AND NOT EXISTS(SELECT 1 FROM studio_timeline_events WHERE id=studio_story_entity_links.linked_entity_id));

CREATE TRIGGER IF NOT EXISTS v130_delete_database AFTER DELETE ON studio_database_records BEGIN
DELETE FROM studio_favorites WHERE entity_type IN ('database','database_record') AND entity_id=OLD.id;
DELETE FROM studio_collection_items WHERE entity_type IN ('database','database_record') AND entity_id=OLD.id;
DELETE FROM studio_tag_assignments WHERE entity_type IN ('database','database_record') AND entity_id=OLD.id;
DELETE FROM studio_media_attachments WHERE entity_type IN ('database','database_record') AND entity_id=OLD.id;
DELETE FROM studio_review_comments WHERE entity_type IN ('database','database_record') AND entity_id=OLD.id;
DELETE FROM studio_assignments WHERE entity_type IN ('database','database_record') AND entity_id=OLD.id;
DELETE FROM studio_universal_links WHERE (source_type IN ('database','database_record') AND source_id=OLD.id) OR (target_type IN ('database','database_record') AND target_id=OLD.id);
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('database','database_record') AND story_entity_id=OLD.id) OR (linked_entity_type IN ('database','database_record') AND linked_entity_id=OLD.id);
DELETE FROM studio_import_results WHERE entity_type='database' AND entity_id=OLD.id;
DELETE FROM studio_entity_slugs WHERE entity_type='database' AND entity_id=OLD.id;
DELETE FROM studio_database_locks WHERE record_id=OLD.id;
DELETE FROM studio_record_references WHERE record_id=OLD.id;
END;
DELETE FROM studio_favorites WHERE entity_type IN ('database','database_record') AND NOT EXISTS(SELECT 1 FROM studio_database_records WHERE id=studio_favorites.entity_id);
DELETE FROM studio_collection_items WHERE entity_type IN ('database','database_record') AND NOT EXISTS(SELECT 1 FROM studio_database_records WHERE id=studio_collection_items.entity_id);
DELETE FROM studio_tag_assignments WHERE entity_type IN ('database','database_record') AND NOT EXISTS(SELECT 1 FROM studio_database_records WHERE id=studio_tag_assignments.entity_id);
DELETE FROM studio_media_attachments WHERE entity_type IN ('database','database_record') AND NOT EXISTS(SELECT 1 FROM studio_database_records WHERE id=studio_media_attachments.entity_id);
DELETE FROM studio_universal_links WHERE (source_type IN ('database','database_record') AND NOT EXISTS(SELECT 1 FROM studio_database_records WHERE id=studio_universal_links.source_id)) OR (target_type IN ('database','database_record') AND NOT EXISTS(SELECT 1 FROM studio_database_records WHERE id=studio_universal_links.target_id));
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('database','database_record') AND NOT EXISTS(SELECT 1 FROM studio_database_records WHERE id=studio_story_entity_links.story_entity_id)) OR (linked_entity_type IN ('database','database_record') AND NOT EXISTS(SELECT 1 FROM studio_database_records WHERE id=studio_story_entity_links.linked_entity_id));

CREATE TRIGGER IF NOT EXISTS v130_delete_story_project AFTER DELETE ON studio_story_projects BEGIN
DELETE FROM studio_favorites WHERE entity_type IN ('story_project','project') AND entity_id=OLD.id;
DELETE FROM studio_collection_items WHERE entity_type IN ('story_project','project') AND entity_id=OLD.id;
DELETE FROM studio_tag_assignments WHERE entity_type IN ('story_project','project') AND entity_id=OLD.id;
DELETE FROM studio_media_attachments WHERE entity_type IN ('story_project','project') AND entity_id=OLD.id;
DELETE FROM studio_review_comments WHERE entity_type IN ('story_project','project') AND entity_id=OLD.id;
DELETE FROM studio_assignments WHERE entity_type IN ('story_project','project') AND entity_id=OLD.id;
DELETE FROM studio_universal_links WHERE (source_type IN ('story_project','project') AND source_id=OLD.id) OR (target_type IN ('story_project','project') AND target_id=OLD.id);
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('story_project','project') AND story_entity_id=OLD.id) OR (linked_entity_type IN ('story_project','project') AND linked_entity_id=OLD.id);
DELETE FROM studio_import_results WHERE entity_type='story_project' AND entity_id=OLD.id;
DELETE FROM studio_entity_slugs WHERE entity_type='story_project' AND entity_id=OLD.id;
END;
DELETE FROM studio_favorites WHERE entity_type IN ('story_project','project') AND NOT EXISTS(SELECT 1 FROM studio_story_projects WHERE id=studio_favorites.entity_id);
DELETE FROM studio_collection_items WHERE entity_type IN ('story_project','project') AND NOT EXISTS(SELECT 1 FROM studio_story_projects WHERE id=studio_collection_items.entity_id);
DELETE FROM studio_tag_assignments WHERE entity_type IN ('story_project','project') AND NOT EXISTS(SELECT 1 FROM studio_story_projects WHERE id=studio_tag_assignments.entity_id);
DELETE FROM studio_media_attachments WHERE entity_type IN ('story_project','project') AND NOT EXISTS(SELECT 1 FROM studio_story_projects WHERE id=studio_media_attachments.entity_id);
DELETE FROM studio_universal_links WHERE (source_type IN ('story_project','project') AND NOT EXISTS(SELECT 1 FROM studio_story_projects WHERE id=studio_universal_links.source_id)) OR (target_type IN ('story_project','project') AND NOT EXISTS(SELECT 1 FROM studio_story_projects WHERE id=studio_universal_links.target_id));
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('story_project','project') AND NOT EXISTS(SELECT 1 FROM studio_story_projects WHERE id=studio_story_entity_links.story_entity_id)) OR (linked_entity_type IN ('story_project','project') AND NOT EXISTS(SELECT 1 FROM studio_story_projects WHERE id=studio_story_entity_links.linked_entity_id));

CREATE TRIGGER IF NOT EXISTS v130_delete_story_arc AFTER DELETE ON studio_story_arcs BEGIN
DELETE FROM studio_favorites WHERE entity_type IN ('story_arc','arc') AND entity_id=OLD.id;
DELETE FROM studio_collection_items WHERE entity_type IN ('story_arc','arc') AND entity_id=OLD.id;
DELETE FROM studio_tag_assignments WHERE entity_type IN ('story_arc','arc') AND entity_id=OLD.id;
DELETE FROM studio_media_attachments WHERE entity_type IN ('story_arc','arc') AND entity_id=OLD.id;
DELETE FROM studio_review_comments WHERE entity_type IN ('story_arc','arc') AND entity_id=OLD.id;
DELETE FROM studio_assignments WHERE entity_type IN ('story_arc','arc') AND entity_id=OLD.id;
DELETE FROM studio_universal_links WHERE (source_type IN ('story_arc','arc') AND source_id=OLD.id) OR (target_type IN ('story_arc','arc') AND target_id=OLD.id);
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('story_arc','arc') AND story_entity_id=OLD.id) OR (linked_entity_type IN ('story_arc','arc') AND linked_entity_id=OLD.id);
DELETE FROM studio_import_results WHERE entity_type='story_arc' AND entity_id=OLD.id;
DELETE FROM studio_entity_slugs WHERE entity_type='story_arc' AND entity_id=OLD.id;
END;
DELETE FROM studio_favorites WHERE entity_type IN ('story_arc','arc') AND NOT EXISTS(SELECT 1 FROM studio_story_arcs WHERE id=studio_favorites.entity_id);
DELETE FROM studio_collection_items WHERE entity_type IN ('story_arc','arc') AND NOT EXISTS(SELECT 1 FROM studio_story_arcs WHERE id=studio_collection_items.entity_id);
DELETE FROM studio_tag_assignments WHERE entity_type IN ('story_arc','arc') AND NOT EXISTS(SELECT 1 FROM studio_story_arcs WHERE id=studio_tag_assignments.entity_id);
DELETE FROM studio_media_attachments WHERE entity_type IN ('story_arc','arc') AND NOT EXISTS(SELECT 1 FROM studio_story_arcs WHERE id=studio_media_attachments.entity_id);
DELETE FROM studio_universal_links WHERE (source_type IN ('story_arc','arc') AND NOT EXISTS(SELECT 1 FROM studio_story_arcs WHERE id=studio_universal_links.source_id)) OR (target_type IN ('story_arc','arc') AND NOT EXISTS(SELECT 1 FROM studio_story_arcs WHERE id=studio_universal_links.target_id));
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('story_arc','arc') AND NOT EXISTS(SELECT 1 FROM studio_story_arcs WHERE id=studio_story_entity_links.story_entity_id)) OR (linked_entity_type IN ('story_arc','arc') AND NOT EXISTS(SELECT 1 FROM studio_story_arcs WHERE id=studio_story_entity_links.linked_entity_id));

CREATE TRIGGER IF NOT EXISTS v130_delete_story_chapter AFTER DELETE ON studio_story_chapters BEGIN
DELETE FROM studio_favorites WHERE entity_type IN ('story_chapter','chapter') AND entity_id=OLD.id;
DELETE FROM studio_collection_items WHERE entity_type IN ('story_chapter','chapter') AND entity_id=OLD.id;
DELETE FROM studio_tag_assignments WHERE entity_type IN ('story_chapter','chapter') AND entity_id=OLD.id;
DELETE FROM studio_media_attachments WHERE entity_type IN ('story_chapter','chapter') AND entity_id=OLD.id;
DELETE FROM studio_review_comments WHERE entity_type IN ('story_chapter','chapter') AND entity_id=OLD.id;
DELETE FROM studio_assignments WHERE entity_type IN ('story_chapter','chapter') AND entity_id=OLD.id;
DELETE FROM studio_universal_links WHERE (source_type IN ('story_chapter','chapter') AND source_id=OLD.id) OR (target_type IN ('story_chapter','chapter') AND target_id=OLD.id);
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('story_chapter','chapter') AND story_entity_id=OLD.id) OR (linked_entity_type IN ('story_chapter','chapter') AND linked_entity_id=OLD.id);
DELETE FROM studio_import_results WHERE entity_type='story_chapter' AND entity_id=OLD.id;
DELETE FROM studio_entity_slugs WHERE entity_type='story_chapter' AND entity_id=OLD.id;
END;
DELETE FROM studio_favorites WHERE entity_type IN ('story_chapter','chapter') AND NOT EXISTS(SELECT 1 FROM studio_story_chapters WHERE id=studio_favorites.entity_id);
DELETE FROM studio_collection_items WHERE entity_type IN ('story_chapter','chapter') AND NOT EXISTS(SELECT 1 FROM studio_story_chapters WHERE id=studio_collection_items.entity_id);
DELETE FROM studio_tag_assignments WHERE entity_type IN ('story_chapter','chapter') AND NOT EXISTS(SELECT 1 FROM studio_story_chapters WHERE id=studio_tag_assignments.entity_id);
DELETE FROM studio_media_attachments WHERE entity_type IN ('story_chapter','chapter') AND NOT EXISTS(SELECT 1 FROM studio_story_chapters WHERE id=studio_media_attachments.entity_id);
DELETE FROM studio_universal_links WHERE (source_type IN ('story_chapter','chapter') AND NOT EXISTS(SELECT 1 FROM studio_story_chapters WHERE id=studio_universal_links.source_id)) OR (target_type IN ('story_chapter','chapter') AND NOT EXISTS(SELECT 1 FROM studio_story_chapters WHERE id=studio_universal_links.target_id));
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('story_chapter','chapter') AND NOT EXISTS(SELECT 1 FROM studio_story_chapters WHERE id=studio_story_entity_links.story_entity_id)) OR (linked_entity_type IN ('story_chapter','chapter') AND NOT EXISTS(SELECT 1 FROM studio_story_chapters WHERE id=studio_story_entity_links.linked_entity_id));

CREATE TRIGGER IF NOT EXISTS v130_delete_story_scene AFTER DELETE ON studio_story_scenes BEGIN
DELETE FROM studio_favorites WHERE entity_type IN ('story_scene','scene') AND entity_id=OLD.id;
DELETE FROM studio_collection_items WHERE entity_type IN ('story_scene','scene') AND entity_id=OLD.id;
DELETE FROM studio_tag_assignments WHERE entity_type IN ('story_scene','scene') AND entity_id=OLD.id;
DELETE FROM studio_media_attachments WHERE entity_type IN ('story_scene','scene') AND entity_id=OLD.id;
DELETE FROM studio_review_comments WHERE entity_type IN ('story_scene','scene') AND entity_id=OLD.id;
DELETE FROM studio_assignments WHERE entity_type IN ('story_scene','scene') AND entity_id=OLD.id;
DELETE FROM studio_universal_links WHERE (source_type IN ('story_scene','scene') AND source_id=OLD.id) OR (target_type IN ('story_scene','scene') AND target_id=OLD.id);
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('story_scene','scene') AND story_entity_id=OLD.id) OR (linked_entity_type IN ('story_scene','scene') AND linked_entity_id=OLD.id);
DELETE FROM studio_import_results WHERE entity_type='story_scene' AND entity_id=OLD.id;
DELETE FROM studio_entity_slugs WHERE entity_type='story_scene' AND entity_id=OLD.id;
END;
DELETE FROM studio_favorites WHERE entity_type IN ('story_scene','scene') AND NOT EXISTS(SELECT 1 FROM studio_story_scenes WHERE id=studio_favorites.entity_id);
DELETE FROM studio_collection_items WHERE entity_type IN ('story_scene','scene') AND NOT EXISTS(SELECT 1 FROM studio_story_scenes WHERE id=studio_collection_items.entity_id);
DELETE FROM studio_tag_assignments WHERE entity_type IN ('story_scene','scene') AND NOT EXISTS(SELECT 1 FROM studio_story_scenes WHERE id=studio_tag_assignments.entity_id);
DELETE FROM studio_media_attachments WHERE entity_type IN ('story_scene','scene') AND NOT EXISTS(SELECT 1 FROM studio_story_scenes WHERE id=studio_media_attachments.entity_id);
DELETE FROM studio_universal_links WHERE (source_type IN ('story_scene','scene') AND NOT EXISTS(SELECT 1 FROM studio_story_scenes WHERE id=studio_universal_links.source_id)) OR (target_type IN ('story_scene','scene') AND NOT EXISTS(SELECT 1 FROM studio_story_scenes WHERE id=studio_universal_links.target_id));
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('story_scene','scene') AND NOT EXISTS(SELECT 1 FROM studio_story_scenes WHERE id=studio_story_entity_links.story_entity_id)) OR (linked_entity_type IN ('story_scene','scene') AND NOT EXISTS(SELECT 1 FROM studio_story_scenes WHERE id=studio_story_entity_links.linked_entity_id));

CREATE TRIGGER IF NOT EXISTS v130_delete_story_beat AFTER DELETE ON studio_story_beats BEGIN
DELETE FROM studio_favorites WHERE entity_type IN ('story_beat','beat') AND entity_id=OLD.id;
DELETE FROM studio_collection_items WHERE entity_type IN ('story_beat','beat') AND entity_id=OLD.id;
DELETE FROM studio_tag_assignments WHERE entity_type IN ('story_beat','beat') AND entity_id=OLD.id;
DELETE FROM studio_media_attachments WHERE entity_type IN ('story_beat','beat') AND entity_id=OLD.id;
DELETE FROM studio_review_comments WHERE entity_type IN ('story_beat','beat') AND entity_id=OLD.id;
DELETE FROM studio_assignments WHERE entity_type IN ('story_beat','beat') AND entity_id=OLD.id;
DELETE FROM studio_universal_links WHERE (source_type IN ('story_beat','beat') AND source_id=OLD.id) OR (target_type IN ('story_beat','beat') AND target_id=OLD.id);
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('story_beat','beat') AND story_entity_id=OLD.id) OR (linked_entity_type IN ('story_beat','beat') AND linked_entity_id=OLD.id);
DELETE FROM studio_import_results WHERE entity_type='story_beat' AND entity_id=OLD.id;
DELETE FROM studio_entity_slugs WHERE entity_type='story_beat' AND entity_id=OLD.id;
END;
DELETE FROM studio_favorites WHERE entity_type IN ('story_beat','beat') AND NOT EXISTS(SELECT 1 FROM studio_story_beats WHERE id=studio_favorites.entity_id);
DELETE FROM studio_collection_items WHERE entity_type IN ('story_beat','beat') AND NOT EXISTS(SELECT 1 FROM studio_story_beats WHERE id=studio_collection_items.entity_id);
DELETE FROM studio_tag_assignments WHERE entity_type IN ('story_beat','beat') AND NOT EXISTS(SELECT 1 FROM studio_story_beats WHERE id=studio_tag_assignments.entity_id);
DELETE FROM studio_media_attachments WHERE entity_type IN ('story_beat','beat') AND NOT EXISTS(SELECT 1 FROM studio_story_beats WHERE id=studio_media_attachments.entity_id);
DELETE FROM studio_universal_links WHERE (source_type IN ('story_beat','beat') AND NOT EXISTS(SELECT 1 FROM studio_story_beats WHERE id=studio_universal_links.source_id)) OR (target_type IN ('story_beat','beat') AND NOT EXISTS(SELECT 1 FROM studio_story_beats WHERE id=studio_universal_links.target_id));
DELETE FROM studio_story_entity_links WHERE (story_entity_type IN ('story_beat','beat') AND NOT EXISTS(SELECT 1 FROM studio_story_beats WHERE id=studio_story_entity_links.story_entity_id)) OR (linked_entity_type IN ('story_beat','beat') AND NOT EXISTS(SELECT 1 FROM studio_story_beats WHERE id=studio_story_entity_links.linked_entity_id));
