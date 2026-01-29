-- Nate Content Projects: Main project table for content calendar
-- Part of Content Calendar & Project Management System

CREATE TABLE nate_content_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT UNIQUE NOT NULL,        -- yyyymmdd_xxx format
  title TEXT NOT NULL,
  scheduled_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'scheduled', 'published')),
  target_platforms JSONB DEFAULT '[]',    -- ['youtube', 'substack', 'tiktok']
  notes TEXT,
  video_runtime TEXT,                     -- e.g., "21:53"
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_nate_content_projects_created_by ON nate_content_projects(created_by);
CREATE INDEX idx_nate_content_projects_status ON nate_content_projects(status);
CREATE INDEX idx_nate_content_projects_scheduled_date ON nate_content_projects(scheduled_date);
CREATE INDEX idx_nate_content_projects_project_id ON nate_content_projects(project_id);

-- Enable RLS
ALTER TABLE nate_content_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects"
  ON nate_content_projects FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own projects"
  ON nate_content_projects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own projects"
  ON nate_content_projects FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own projects"
  ON nate_content_projects FOR DELETE
  USING (auth.uid() = created_by);

-- Updated_at trigger
CREATE TRIGGER update_nate_content_projects_updated_at
  BEFORE UPDATE ON nate_content_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE nate_content_projects IS 'Content projects for calendar management and publication tracking';
COMMENT ON COLUMN nate_content_projects.project_id IS 'Human-readable ID in yyyymmdd_xxx format';
COMMENT ON COLUMN nate_content_projects.target_platforms IS 'Array of platform slugs this content targets';
COMMENT ON COLUMN nate_content_projects.video_runtime IS 'Video duration in HH:MM:SS or MM:SS format';
