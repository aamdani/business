-- Slack Ideas: Captured ideas from various sources
-- Primary table for the Ideas Capture feature

CREATE TABLE slack_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  raw_content TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'slack'
    CHECK (source_type IN ('slack', 'recording', 'manual', 'x_share', 'granola', 'substack')),
  source_url TEXT,

  -- Slack-specific metadata
  slack_message_id TEXT,
  slack_channel_id TEXT,
  slack_timestamp TIMESTAMPTZ,
  slack_user_id TEXT,

  -- Recording linkage (for ramble recordings)
  recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL,

  -- AI-generated fields
  summary TEXT,
  extracted_topics JSONB DEFAULT '[]',
  idea_type TEXT CHECK (idea_type IN ('observation', 'question', 'concept', 'reference', 'todo')),
  potential_angles JSONB DEFAULT '[]',
  embedding_id TEXT,

  -- Clustering
  cluster_id UUID REFERENCES idea_clusters(id) ON DELETE SET NULL,
  cluster_confidence REAL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'in_progress', 'drafted', 'archived')),
  content_session_id UUID REFERENCES content_sessions(id) ON DELETE SET NULL,

  -- Pinecone indexing status
  pinecone_indexed BOOLEAN DEFAULT false,
  pinecone_indexed_at TIMESTAMPTZ,
  pinecone_error TEXT,

  -- Timestamps
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_slack_ideas_user_id ON slack_ideas(user_id);
CREATE INDEX idx_slack_ideas_status ON slack_ideas(status);
CREATE INDEX idx_slack_ideas_cluster ON slack_ideas(cluster_id);
CREATE INDEX idx_slack_ideas_source ON slack_ideas(source_type);
CREATE INDEX idx_slack_ideas_captured ON slack_ideas(captured_at DESC);
CREATE INDEX idx_slack_ideas_processed ON slack_ideas(processed_at) WHERE processed_at IS NOT NULL;

-- Unique constraint for Slack messages to prevent duplicates
CREATE UNIQUE INDEX idx_slack_ideas_slack_msg ON slack_ideas(slack_message_id) WHERE slack_message_id IS NOT NULL;

-- Full-text search index
CREATE INDEX idx_slack_ideas_content_fts ON slack_ideas USING GIN (to_tsvector('english', raw_content));

-- Index for finding unprocessed ideas
CREATE INDEX idx_slack_ideas_unprocessed ON slack_ideas(created_at) WHERE processed_at IS NULL;

-- Index for finding un-indexed ideas (for Pinecone retry)
CREATE INDEX idx_slack_ideas_pinecone_unindexed ON slack_ideas(pinecone_indexed) WHERE pinecone_indexed = false;

-- Enable RLS
ALTER TABLE slack_ideas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own ideas"
  ON slack_ideas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ideas"
  ON slack_ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ideas"
  ON slack_ideas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ideas"
  ON slack_ideas FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_slack_ideas_updated_at
  BEFORE UPDATE ON slack_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
