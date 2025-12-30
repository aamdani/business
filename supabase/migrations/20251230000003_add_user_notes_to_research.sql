-- Add user_notes column to content_research table
-- This allows users to make commentary on research that flows to the outline

ALTER TABLE content_research
ADD COLUMN IF NOT EXISTS user_notes TEXT;

COMMENT ON COLUMN content_research.user_notes IS 'User commentary and notes on the research results';
