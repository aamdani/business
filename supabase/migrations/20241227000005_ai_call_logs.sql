-- AI Call Logs table for troubleshooting
CREATE TABLE IF NOT EXISTS ai_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES content_sessions(id) ON DELETE SET NULL,
  prompt_set_slug TEXT,
  full_prompt TEXT NOT NULL,
  full_response TEXT NOT NULL,
  model_id TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs for their sessions
CREATE POLICY "Users can view own session logs"
  ON ai_call_logs FOR SELECT
  USING (
    session_id IS NULL OR
    EXISTS (
      SELECT 1 FROM content_sessions
      WHERE content_sessions.id = ai_call_logs.session_id
      AND content_sessions.user_id = auth.uid()
    )
  );

-- Service role can insert logs (from edge functions)
CREATE POLICY "Service role can insert logs"
  ON ai_call_logs FOR INSERT
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_ai_call_logs_session ON ai_call_logs(session_id);
CREATE INDEX idx_ai_call_logs_prompt_slug ON ai_call_logs(prompt_set_slug);
CREATE INDEX idx_ai_call_logs_created_at ON ai_call_logs(created_at DESC);
