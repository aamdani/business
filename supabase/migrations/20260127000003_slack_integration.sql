-- Slack Integration Config: OAuth tokens and sync state
-- Stores per-user Slack workspace connections

CREATE TABLE slack_integration_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens (stored securely)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  bot_user_id TEXT,

  -- Workspace info
  team_id TEXT NOT NULL,
  team_name TEXT,

  -- Channel configuration
  channel_id TEXT NOT NULL,
  channel_name TEXT DEFAULT 'ideas-capture',

  -- Sync state
  last_sync_at TIMESTAMPTZ,
  last_message_ts TEXT,  -- Slack message timestamp for pagination
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
  sync_error TEXT,
  messages_synced INTEGER DEFAULT 0,

  -- Settings
  is_active BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 15,
  auto_process BOOLEAN DEFAULT true,  -- Automatically process ideas after sync

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One config per workspace per user
  UNIQUE(user_id, team_id)
);

-- Indexes
CREATE INDEX idx_slack_config_user ON slack_integration_config(user_id);
CREATE INDEX idx_slack_config_active ON slack_integration_config(is_active) WHERE is_active = true;
CREATE INDEX idx_slack_config_sync ON slack_integration_config(last_sync_at);

-- Enable RLS
ALTER TABLE slack_integration_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies (strict - only own config)
CREATE POLICY "Users can view own slack config"
  ON slack_integration_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own slack config"
  ON slack_integration_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own slack config"
  ON slack_integration_config FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own slack config"
  ON slack_integration_config FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_slack_integration_config_updated_at
  BEFORE UPDATE ON slack_integration_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
