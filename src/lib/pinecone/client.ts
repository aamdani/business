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

// Get the configured index name
export function getPineconeIndexName(): string {
  return process.env.PINECONE_INDEX || "content-master-pro-v2";
}

// Get index instance
export function getPineconeIndex() {
  const client = getPineconeClient();
  return client.index(getPineconeIndexName());
}

// Get index with a specific namespace
export function getPineconeNamespace(namespace: string) {
  return getPineconeIndex().namespace(namespace);
}
