-- Add 'ideas' namespace to Pinecone configuration
-- This namespace stores personal idea embeddings for semantic search and clustering

INSERT INTO pinecone_namespaces (
  slug,
  display_name,
  description,
  source_type,
  is_active,
  is_searchable,
  sort_order
) VALUES (
  'ideas',
  'Ideas',
  'Personal ideas captured from Slack, voice recordings, and manual entry',
  'ideas',
  true,
  true,
  5
);
