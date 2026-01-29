-- Nate Project Publications: Track where/when content was published
-- Part of Content Calendar & Project Management System
-- Links projects to destinations for publication tracking

CREATE TABLE nate_project_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES nate_content_projects(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES destinations(id),  -- Link to existing destinations table
  platform TEXT NOT NULL,                 -- youtube, tiktok, substack, linkedin
  published_at TIMESTAMPTZ NOT NULL,
  published_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_nate_project_publications_project_id ON nate_project_publications(project_id);
CREATE INDEX idx_nate_project_publications_platform ON nate_project_publications(platform);
CREATE INDEX idx_nate_project_publications_published_at ON nate_project_publications(published_at);

-- Enable RLS
ALTER TABLE nate_project_publications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Publications inherit ownership from their parent project
CREATE POLICY "Users can view own project publications"
  ON nate_project_publications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nate_content_projects
      WHERE nate_content_projects.id = nate_project_publications.project_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project publications"
  ON nate_project_publications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nate_content_projects
      WHERE nate_content_projects.id = nate_project_publications.project_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own project publications"
  ON nate_project_publications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM nate_content_projects
      WHERE nate_content_projects.id = nate_project_publications.project_id
      AND nate_content_projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nate_content_projects
      WHERE nate_content_projects.id = nate_project_publications.project_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project publications"
  ON nate_project_publications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM nate_content_projects
      WHERE nate_content_projects.id = nate_project_publications.project_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE nate_project_publications IS 'Track where and when content has been published';
COMMENT ON COLUMN nate_project_publications.destination_id IS 'Optional link to destinations table for platform config';
COMMENT ON COLUMN nate_project_publications.platform IS 'Platform name (youtube, tiktok, substack, linkedin, etc.)';
COMMENT ON COLUMN nate_project_publications.published_url IS 'URL where the content was published';
COMMENT ON COLUMN nate_project_publications.metadata IS 'Additional platform-specific metadata (views, engagement, etc.)';
