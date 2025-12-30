-- Add user_selections column to content_brain_dumps
-- Stores which themes/queries/insights the user selected, plus skip_research flag
-- This enables full session resume without losing selection state

ALTER TABLE content_brain_dumps
  ADD COLUMN IF NOT EXISTS user_selections JSONB DEFAULT NULL;

-- Example structure:
-- {
--   "selected_theme_indices": [0, 2],
--   "selected_query_indices": [0, 1],
--   "selected_insight_indices": [1],
--   "skip_research": false
-- }
