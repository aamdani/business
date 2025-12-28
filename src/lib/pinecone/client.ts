import { Pinecone } from "@pinecone-database/pinecone";

// Singleton pattern for Pinecone client
let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

// Get index with the configured host
export function getPineconeIndex() {
  const client = getPineconeClient();
  // Extract index name from host URL
  // e.g., "https://aicred-context-h9g6rmn.svc.aped-4627-b74a.pinecone.io"
  // -> "aicred-context"
  const host = process.env.PINECONE_HOST!;
  const indexName = host.split("//")[1].split("-")[0] + "-" + host.split("//")[1].split("-")[1];

  return client.index(indexName).namespace("content-hub-posts");
}

// Namespaces used in this project
export const PINECONE_NAMESPACES = {
  POSTS: "content-hub-posts",        // Jon's and Nate's posts
  RESEARCH: "content-hub-research",  // Perplexity research results
  BRAIN_DUMPS: "content-hub-brain-dumps", // Processed brain dumps
} as const;

export type PineconeNamespace = typeof PINECONE_NAMESPACES[keyof typeof PINECONE_NAMESPACES];
