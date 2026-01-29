-- Idea Clusters: Semantic groupings of ideas
-- NOTE: This table must be created BEFORE slack_ideas due to FK dependency

CREATE TABLE idea_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Cluster metadata
  name TEXT NOT NULL,
  description TEXT,
  representative_embedding TEXT,  -- Pinecone ID of centroid vector

  -- Lifecycle
  is_active BOOLEAN DEFAULT true,
  idea_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_idea_clusters_user ON idea_clusters(user_id);
CREATE INDEX idx_idea_clusters_active ON idea_clusters(is_active, idea_count DESC);

-- Enable RLS
ALTER TABLE idea_clusters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own clusters"
  ON idea_clusters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clusters"
  ON idea_clusters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clusters"
  ON idea_clusters FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clusters"
  ON idea_clusters FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_idea_clusters_updated_at
  BEFORE UPDATE ON idea_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
