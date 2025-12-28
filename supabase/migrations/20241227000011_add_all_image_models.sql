-- Add comprehensive image generation models from Vercel AI Gateway
-- Reference: https://vercel.com/ai-gateway/models

-- Google Imagen models
INSERT INTO ai_models (model_id, provider, display_name, context_window, max_output_tokens, supports_images, supports_streaming) VALUES
  ('google/imagen-4.0-generate', 'google', 'Imagen 4.0 Generate', NULL, NULL, TRUE, FALSE),
  ('google/imagen-4.0-fast-generate', 'google', 'Imagen 4.0 Fast Generate', NULL, NULL, TRUE, FALSE),
  ('google/imagen-4.0-ultra-generate', 'google', 'Imagen 4.0 Ultra Generate', NULL, NULL, TRUE, FALSE)
ON CONFLICT (model_id) DO NOTHING;

-- OpenAI DALL-E models
INSERT INTO ai_models (model_id, provider, display_name, context_window, max_output_tokens, supports_images, supports_streaming) VALUES
  ('openai/dall-e-3', 'openai', 'DALL·E 3', NULL, NULL, TRUE, FALSE),
  ('openai/dall-e-2', 'openai', 'DALL·E 2', NULL, NULL, TRUE, FALSE)
ON CONFLICT (model_id) DO NOTHING;

-- Black Forest Labs FLUX models
INSERT INTO ai_models (model_id, provider, display_name, context_window, max_output_tokens, supports_images, supports_streaming) VALUES
  ('bfl/flux-2-pro', 'bfl', 'FLUX 2 Pro', NULL, NULL, TRUE, FALSE),
  ('bfl/flux-2-flex', 'bfl', 'FLUX 2 Flex', NULL, NULL, TRUE, FALSE),
  ('bfl/flux-pro-1.1-ultra', 'bfl', 'FLUX 1.1 Pro Ultra', NULL, NULL, TRUE, FALSE),
  ('bfl/flux-pro-1.1', 'bfl', 'FLUX 1.1 Pro', NULL, NULL, TRUE, FALSE),
  ('bfl/flux-pro-1.0-fill', 'bfl', 'FLUX 1.0 Fill Pro', NULL, NULL, TRUE, FALSE),
  ('bfl/flux-kontext-max', 'bfl', 'FLUX Kontext Max', NULL, NULL, TRUE, FALSE),
  ('bfl/flux-kontext-pro', 'bfl', 'FLUX Kontext Pro', NULL, NULL, TRUE, FALSE)
ON CONFLICT (model_id) DO NOTHING;
