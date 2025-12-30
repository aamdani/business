-- Add Pinecone indexing tracking columns to content_research table
-- This allows us to track which research has been embedded in Pinecone

ALTER TABLE content_research
  ADD COLUMN IF NOT EXISTS pinecone_indexed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinecone_indexed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinecone_error TEXT;

-- Index for efficiently finding unindexed research (for retry jobs)
CREATE INDEX IF NOT EXISTS idx_content_research_pinecone_unindexed
  ON content_research(pinecone_indexed)
  WHERE pinecone_indexed = false;

-- Comment for documentation
COMMENT ON COLUMN content_research.pinecone_indexed IS 'Whether this research has been embedded in Pinecone';
COMMENT ON COLUMN content_research.pinecone_indexed_at IS 'When the research was successfully embedded';
COMMENT ON COLUMN content_research.pinecone_error IS 'Error message if embedding failed (for debugging/retry)';
