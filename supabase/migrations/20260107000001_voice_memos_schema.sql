-- Voice Memos Initial Schema
-- Creates all tables with RLS policies

-- Table: recordings
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File metadata
  filename TEXT NOT NULL,
  storage_path TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  mime_type TEXT,

  -- Processing state
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),
  error_message TEXT,
  assemblyai_transcript_id TEXT,
  summary_mode_id UUID,

  -- Lifecycle
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  audio_deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_expires_at ON recordings(expires_at) WHERE storage_path IS NOT NULL;

-- Table: transcripts
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  utterances JSONB,

  -- Metadata from AssemblyAI
  assemblyai_id TEXT NOT NULL,
  confidence REAL,
  word_count INTEGER,
  speaker_count INTEGER,
  language_code TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(recording_id)
);

CREATE INDEX idx_transcripts_content_fts ON transcripts
  USING GIN (to_tsvector('english', content));
CREATE INDEX idx_transcripts_recording_id ON transcripts(recording_id);

-- Table: transcript_speakers
CREATE TABLE transcript_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,

  speaker_label TEXT NOT NULL,
  display_name TEXT,
  contact_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(transcript_id, speaker_label)
);

CREATE INDEX idx_transcript_speakers_transcript_id ON transcript_speakers(transcript_id);
CREATE INDEX idx_transcript_speakers_contact_id ON transcript_speakers(contact_id) WHERE contact_id IS NOT NULL;

-- Table: summary_modes
CREATE TABLE summary_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,

  is_system_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summary_modes_user_id ON summary_modes(user_id);

-- Table: summaries
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  summary_mode_id UUID NOT NULL REFERENCES summary_modes(id) ON DELETE RESTRICT,

  content TEXT NOT NULL,

  model_used TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summaries_transcript_id ON summaries(transcript_id);
CREATE INDEX idx_summaries_mode_id ON summaries(summary_mode_id);

-- Add foreign key for recordings.summary_mode_id
ALTER TABLE recordings
  ADD CONSTRAINT fk_recordings_summary_mode
  FOREIGN KEY (summary_mode_id) REFERENCES summary_modes(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE summary_modes ENABLE ROW LEVEL SECURITY;

-- Recordings: users see only their own
CREATE POLICY "Users can view own recordings" ON recordings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recordings" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recordings" ON recordings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recordings" ON recordings
  FOR DELETE USING (auth.uid() = user_id);

-- Transcripts: via recording ownership
CREATE POLICY "Users can view own transcripts" ON transcripts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM recordings WHERE recordings.id = transcripts.recording_id AND recordings.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own transcripts" ON transcripts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM recordings WHERE recordings.id = transcripts.recording_id AND recordings.user_id = auth.uid())
  );

-- Transcript speakers: via transcript -> recording ownership
CREATE POLICY "Users can view own transcript speakers" ON transcript_speakers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transcripts t
      JOIN recordings r ON r.id = t.recording_id
      WHERE t.id = transcript_speakers.transcript_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own transcript speakers" ON transcript_speakers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcripts t
      JOIN recordings r ON r.id = t.recording_id
      WHERE t.id = transcript_speakers.transcript_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own transcript speakers" ON transcript_speakers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM transcripts t
      JOIN recordings r ON r.id = t.recording_id
      WHERE t.id = transcript_speakers.transcript_id AND r.user_id = auth.uid()
    )
  );

-- Summaries: via transcript -> recording ownership
CREATE POLICY "Users can view own summaries" ON summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transcripts t
      JOIN recordings r ON r.id = t.recording_id
      WHERE t.id = summaries.transcript_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own summaries" ON summaries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcripts t
      JOIN recordings r ON r.id = t.recording_id
      WHERE t.id = summaries.transcript_id AND r.user_id = auth.uid()
    )
  );

-- Summary modes: users see system defaults + their own
CREATE POLICY "Users can view summary modes" ON summary_modes
  FOR SELECT USING (is_system_default = true OR user_id = auth.uid());
CREATE POLICY "Users can insert own modes" ON summary_modes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system_default = false);
CREATE POLICY "Users can update own modes" ON summary_modes
  FOR UPDATE USING (auth.uid() = user_id AND is_system_default = false);
CREATE POLICY "Users can delete own modes" ON summary_modes
  FOR DELETE USING (auth.uid() = user_id AND is_system_default = false);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_recordings_updated_at
  BEFORE UPDATE ON recordings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcript_speakers_updated_at
  BEFORE UPDATE ON transcript_speakers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summary_modes_updated_at
  BEFORE UPDATE ON summary_modes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default summary modes
INSERT INTO summary_modes (name, description, prompt_template, is_system_default, display_order) VALUES
(
  'Quick Summary',
  'A concise overview of the main points',
  'Create a brief summary (2-3 paragraphs) highlighting the main topics discussed, key decisions made, and important outcomes. Focus on clarity and brevity.',
  true,
  1
),
(
  'Meeting Notes',
  'Structured notes with action items',
  'Format this as professional meeting notes with the following sections:

1. **Overview**: Brief description of the meeting purpose
2. **Key Discussion Points**: Bullet points of main topics
3. **Decisions Made**: Any decisions that were reached
4. **Action Items**: Tasks assigned with who is responsible (if mentioned)
5. **Next Steps**: Upcoming activities or follow-up items

Use clear, professional language.',
  true,
  2
),
(
  'Brain Dump Organization',
  'Organize scattered thoughts into coherent themes',
  'This recording is a brain dump or stream of consciousness. Please:

1. Identify distinct themes or topics mentioned
2. Group related ideas together under clear headings
3. Extract any actionable items or tasks
4. Note any questions or items that need follow-up
5. Summarize the overall priorities or concerns

Present the information in an organized, easy-to-scan format.',
  true,
  3
),
(
  'Detailed Transcript Summary',
  'Comprehensive summary with quotes',
  'Create a detailed summary that:

1. Covers all major points discussed in chronological order
2. Includes key quotes when particularly important or memorable
3. Attributes statements to specific speakers when relevant
4. Notes any disagreements or different perspectives
5. Captures nuances and context

This should be thorough enough to serve as a reference for someone who wasn''t present.',
  true,
  4
);
