-- Pinecone Namespace Management
-- Database-driven configuration for Pinecone namespaces

CREATE TABLE pinecone_namespaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'jon', 'nate', 'official-docs', 'research'
  display_name TEXT NOT NULL,          -- 'Jon', 'Nate', 'Official Docs', 'Research'
  description TEXT,                    -- Optional description
  source_type TEXT,                    -- 'newsletter', 'documentation', 'research'
  is_active BOOLEAN DEFAULT true,      -- Enable/disable namespace
  is_searchable BOOLEAN DEFAULT true,  -- Include in search results
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_pinecone_namespaces_slug ON pinecone_namespaces(slug);
CREATE INDEX idx_pinecone_namespaces_is_active ON pinecone_namespaces(is_active);
CREATE INDEX idx_pinecone_namespaces_is_searchable ON pinecone_namespaces(is_searchable);
CREATE INDEX idx_pinecone_namespaces_source_type ON pinecone_namespaces(source_type);

-- Enable RLS
ALTER TABLE pinecone_namespaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can read, only admins can write
-- For now, allow all authenticated users to manage namespaces
CREATE POLICY "Authenticated users can read namespaces"
  ON pinecone_namespaces
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert namespaces"
  ON pinecone_namespaces
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update namespaces"
  ON pinecone_namespaces
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete namespaces"
  ON pinecone_namespaces
  FOR DELETE
  TO authenticated
  USING (true);

-- Seed initial namespaces
INSERT INTO pinecone_namespaces (slug, display_name, description, source_type, sort_order) VALUES
  ('jon', 'Jon', 'Jonathan Edwards'' Limited Edition Jonathan newsletter posts', 'newsletter', 1),
  ('nate', 'Nate', 'Nate''s newsletter posts', 'newsletter', 2),
  ('official-docs', 'Official Docs', 'Official documentation and guides', 'documentation', 3),
  ('research', 'Research', 'Research materials and references', 'research', 4);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_pinecone_namespaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pinecone_namespaces_updated_at
  BEFORE UPDATE ON pinecone_namespaces
  FOR EACH ROW
  EXECUTE FUNCTION update_pinecone_namespaces_updated_at();
