-- Voice Guidelines table (editable in-app per user)
CREATE TABLE IF NOT EXISTS voice_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Voice',
  guidelines TEXT NOT NULL,
  examples JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE voice_guidelines ENABLE ROW LEVEL SECURITY;

-- Users can manage their own voice guidelines
CREATE POLICY "Users can view own voice guidelines"
  ON voice_guidelines FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create voice guidelines"
  ON voice_guidelines FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own voice guidelines"
  ON voice_guidelines FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own voice guidelines"
  ON voice_guidelines FOR DELETE
  USING (user_id = auth.uid());

-- Index for faster queries
CREATE INDEX idx_voice_guidelines_user ON voice_guidelines(user_id);
CREATE INDEX idx_voice_guidelines_default ON voice_guidelines(user_id, is_default) WHERE is_default = true;

-- Trigger for updated_at
CREATE TRIGGER update_voice_guidelines_updated_at
  BEFORE UPDATE ON voice_guidelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
