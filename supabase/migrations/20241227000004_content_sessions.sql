-- Content Sessions table
CREATE TABLE IF NOT EXISTS content_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'brain_dump' CHECK (status IN (
    'brain_dump', 'research', 'outline', 'draft', 'review', 'outputs', 'completed'
  )),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brain Dumps table
CREATE TABLE IF NOT EXISTS content_brain_dumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES content_sessions(id) ON DELETE CASCADE,
  raw_content TEXT NOT NULL,
  extracted_themes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Research table
CREATE TABLE IF NOT EXISTS content_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES content_sessions(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Outlines table
CREATE TABLE IF NOT EXISTS content_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES content_sessions(id) ON DELETE CASCADE,
  outline_json JSONB NOT NULL,
  selected BOOLEAN DEFAULT FALSE,
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Drafts table
CREATE TABLE IF NOT EXISTS content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES content_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  voice_score JSONB,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Outputs table
CREATE TABLE IF NOT EXISTS content_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES content_sessions(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL CHECK (output_type IN (
    'substack_post', 'substack_image',
    'youtube_script', 'youtube_description', 'youtube_thumbnail',
    'tiktok_15s', 'tiktok_30s', 'tiktok_60s',
    'shorts_script', 'reels_script'
  )),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE content_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_brain_dumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_outputs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can manage own sessions"
  ON content_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Users can manage content in their sessions
CREATE POLICY "Users can manage own brain_dumps"
  ON content_brain_dumps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_sessions
      WHERE content_sessions.id = content_brain_dumps.session_id
      AND content_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own research"
  ON content_research FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_sessions
      WHERE content_sessions.id = content_research.session_id
      AND content_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own outlines"
  ON content_outlines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_sessions
      WHERE content_sessions.id = content_outlines.session_id
      AND content_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own drafts"
  ON content_drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_sessions
      WHERE content_sessions.id = content_drafts.session_id
      AND content_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own outputs"
  ON content_outputs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_sessions
      WHERE content_sessions.id = content_outputs.session_id
      AND content_sessions.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER content_sessions_updated_at
  BEFORE UPDATE ON content_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
