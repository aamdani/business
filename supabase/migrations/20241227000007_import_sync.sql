-- Imported posts from external sources (Substack, etc.)
CREATE TABLE IF NOT EXISTS imported_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL, -- 'jon_substack', 'nate_substack', 'external'
  external_id TEXT, -- Original post ID from source
  url TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  author TEXT,
  published_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  pinecone_id TEXT, -- ID in Pinecone vector store
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, external_id)
);

-- Enable RLS
ALTER TABLE imported_posts ENABLE ROW LEVEL SECURITY;

-- Users can view their own imported posts
CREATE POLICY "Users can view own imported posts"
  ON imported_posts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create imported posts"
  ON imported_posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own imported posts"
  ON imported_posts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own imported posts"
  ON imported_posts FOR DELETE
  USING (user_id = auth.uid());

-- Sync manifests for tracking import status
CREATE TABLE IF NOT EXISTS sync_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL, -- 'jon_substack', 'nate_substack'
  last_sync_at TIMESTAMPTZ,
  post_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'idle', -- 'idle', 'syncing', 'completed', 'error'
  error_message TEXT,
  sync_config JSONB DEFAULT '{}'::jsonb, -- Store sync settings (schedule, filters, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source)
);

-- Enable RLS
ALTER TABLE sync_manifests ENABLE ROW LEVEL SECURITY;

-- Users can manage their own sync manifests
CREATE POLICY "Users can view own sync manifests"
  ON sync_manifests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create sync manifests"
  ON sync_manifests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sync manifests"
  ON sync_manifests FOR UPDATE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_imported_posts_user ON imported_posts(user_id);
CREATE INDEX idx_imported_posts_source ON imported_posts(source);
CREATE INDEX idx_imported_posts_published ON imported_posts(published_at DESC);
CREATE INDEX idx_imported_posts_pinecone ON imported_posts(pinecone_id) WHERE pinecone_id IS NOT NULL;
CREATE INDEX idx_sync_manifests_user ON sync_manifests(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_imported_posts_updated_at
  BEFORE UPDATE ON imported_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_manifests_updated_at
  BEFORE UPDATE ON sync_manifests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
