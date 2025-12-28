-- Add Gemini 3 Pro Image model for image generation
INSERT INTO ai_models (model_id, provider, display_name, context_window, max_output_tokens, supports_images, supports_streaming) VALUES
  ('google/gemini-3-pro-image', 'google', 'Gemini 3 Pro Image (Nano Banana Pro)', 200000, 8192, TRUE, TRUE)
ON CONFLICT (model_id) DO NOTHING;

-- Update gemini-2.0-flash description to clarify it's not for image generation
-- (The display_name stays the same, but we're documenting the correct use case in CLAUDE.md)
