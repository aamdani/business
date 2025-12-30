-- Add unique constraints on session_id for tables that should have one record per session
-- This enables upsert functionality for session persistence

-- content_brain_dumps: one brain dump per session
ALTER TABLE content_brain_dumps
  ADD CONSTRAINT content_brain_dumps_session_id_unique UNIQUE (session_id);

-- content_outlines: one active outline per session
ALTER TABLE content_outlines
  ADD CONSTRAINT content_outlines_session_id_unique UNIQUE (session_id);

-- content_drafts: one active draft per session
ALTER TABLE content_drafts
  ADD CONSTRAINT content_drafts_session_id_unique UNIQUE (session_id);

-- Note: content_research and content_outputs intentionally allow multiple records per session
-- - Research: multiple queries per session
-- - Outputs: multiple output types (youtube_script, tiktok_30s, etc.) per session
