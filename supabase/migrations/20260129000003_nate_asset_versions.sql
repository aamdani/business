-- Nate Asset Versions: Version history for assets
-- Part of Content Calendar & Project Management System
-- Every save creates a new version for full history tracking

CREATE TABLE nate_asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES nate_project_assets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, version_number)
);

-- Indexes
CREATE INDEX idx_nate_asset_versions_asset_id ON nate_asset_versions(asset_id);
CREATE INDEX idx_nate_asset_versions_created_by ON nate_asset_versions(created_by);

-- Enable RLS
ALTER TABLE nate_asset_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Versions inherit ownership through asset -> project chain
CREATE POLICY "Users can view own asset versions"
  ON nate_asset_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nate_project_assets
      JOIN nate_content_projects ON nate_content_projects.id = nate_project_assets.project_id
      WHERE nate_project_assets.id = nate_asset_versions.asset_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert own asset versions"
  ON nate_asset_versions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM nate_project_assets
      JOIN nate_content_projects ON nate_content_projects.id = nate_project_assets.project_id
      WHERE nate_project_assets.id = nate_asset_versions.asset_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own asset versions"
  ON nate_asset_versions FOR UPDATE
  USING (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM nate_project_assets
      JOIN nate_content_projects ON nate_content_projects.id = nate_project_assets.project_id
      WHERE nate_project_assets.id = nate_asset_versions.asset_id
      AND nate_content_projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM nate_project_assets
      JOIN nate_content_projects ON nate_content_projects.id = nate_project_assets.project_id
      WHERE nate_project_assets.id = nate_asset_versions.asset_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own asset versions"
  ON nate_asset_versions FOR DELETE
  USING (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM nate_project_assets
      JOIN nate_content_projects ON nate_content_projects.id = nate_project_assets.project_id
      WHERE nate_project_assets.id = nate_asset_versions.asset_id
      AND nate_content_projects.created_by = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE nate_asset_versions IS 'Version history for asset content - each save creates a new version';
COMMENT ON COLUMN nate_asset_versions.version_number IS 'Sequential version number within the asset';
COMMENT ON COLUMN nate_asset_versions.content IS 'Full content snapshot at this version';
