-- Nate Project Assets: Individual content pieces within a project
-- Part of Content Calendar & Project Management System
-- Includes edit locking fields for collaborative editing

CREATE TABLE nate_project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES nate_content_projects(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,               -- post, transcript_youtube, description_youtube, prompts, guide, etc.
  title TEXT,
  content TEXT,
  current_version INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'final')),
  external_url TEXT,                      -- Legacy Google Doc link
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_nate_project_assets_project_id ON nate_project_assets(project_id);
CREATE INDEX idx_nate_project_assets_asset_type ON nate_project_assets(asset_type);
CREATE INDEX idx_nate_project_assets_status ON nate_project_assets(status);
CREATE INDEX idx_nate_project_assets_locked_by ON nate_project_assets(locked_by) WHERE locked_by IS NOT NULL;

-- Enable RLS
ALTER TABLE nate_project_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Assets inherit ownership from their parent project
CREATE POLICY "Users can view own project assets"
  ON nate_project_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nate_content_projects
      WHERE nate_content_projects.id = nate_project_assets.project_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project assets"
  ON nate_project_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nate_content_projects
      WHERE nate_content_projects.id = nate_project_assets.project_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own project assets"
  ON nate_project_assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM nate_content_projects
      WHERE nate_content_projects.id = nate_project_assets.project_id
      AND nate_content_projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nate_content_projects
      WHERE nate_content_projects.id = nate_project_assets.project_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project assets"
  ON nate_project_assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM nate_content_projects
      WHERE nate_content_projects.id = nate_project_assets.project_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_nate_project_assets_updated_at
  BEFORE UPDATE ON nate_project_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE nate_project_assets IS 'Individual content pieces within a project (scripts, descriptions, prompts, etc.)';
COMMENT ON COLUMN nate_project_assets.asset_type IS 'Type of asset: post, transcript_youtube, description_youtube, prompts, guide, etc.';
COMMENT ON COLUMN nate_project_assets.external_url IS 'Link to external document (e.g., legacy Google Doc)';
COMMENT ON COLUMN nate_project_assets.locked_by IS 'User currently editing this asset (edit lock)';
COMMENT ON COLUMN nate_project_assets.locked_at IS 'When the edit lock was acquired';
