import "@testing-library/jest-dom";

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.PINECONE_API_KEY = "test-pinecone-key";
process.env.PINECONE_HOST = "https://test-index.svc.pinecone.io";
process.env.VERCEL_AI_GATEWAY_API_KEY = "test-ai-key";
