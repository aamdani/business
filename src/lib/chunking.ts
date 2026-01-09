/**
 * Content Chunking Utilities
 *
 * Word-based chunking with overlap for embedding long-form content.
 * Each chunk includes YAML frontmatter for independent retrievability.
 */

export interface ChunkMetadata {
  title: string;
  author: string;
  url: string;
  published: string;
  source: string;
}

export interface ContentChunk {
  content: string; // Full chunk with YAML frontmatter
  chunkIndex: number;
  chunkCount: number;
  metadata: ChunkMetadata & {
    chunk_index: number;
    chunk_count: number;
  };
}

// Configuration
const TARGET_CHUNK_WORDS = 800;
const OVERLAP_PERCENTAGE = 0.1; // 10% overlap
const OVERLAP_WORDS = Math.floor(TARGET_CHUNK_WORDS * OVERLAP_PERCENTAGE);

/**
 * Split content into word-based chunks with overlap
 *
 * @param content - The raw content to chunk (without frontmatter)
 * @param metadata - Metadata to include in each chunk's frontmatter
 * @returns Array of chunks, each with full frontmatter
 */
export function chunkContent(
  content: string,
  metadata: ChunkMetadata
): ContentChunk[] {
  // Split into words while preserving structure
  const words = content.split(/\s+/).filter((w) => w.length > 0);

  // If content is small enough, return as single chunk
  if (words.length <= TARGET_CHUNK_WORDS) {
    return [
      createChunk(content, metadata, 0, 1),
    ];
  }

  const chunks: ContentChunk[] = [];
  let startIndex = 0;
  const stepSize = TARGET_CHUNK_WORDS - OVERLAP_WORDS;

  // Calculate total chunks needed
  const totalChunks = Math.ceil(
    (words.length - OVERLAP_WORDS) / stepSize
  );

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + TARGET_CHUNK_WORDS, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    const chunkContent = chunkWords.join(" ");

    chunks.push(
      createChunk(chunkContent, metadata, chunks.length, totalChunks)
    );

    // Move to next chunk position (with overlap)
    startIndex += stepSize;

    // Don't create tiny final chunks
    if (words.length - startIndex < OVERLAP_WORDS * 2) {
      break;
    }
  }

  // Update chunk counts now that we know the final count
  return chunks.map((chunk, idx) => ({
    ...chunk,
    chunkCount: chunks.length,
    content: createChunkContent(
      chunk.content.split("---\n").slice(2).join("---\n"), // Extract content after frontmatter
      chunk.metadata,
      idx,
      chunks.length
    ),
    metadata: {
      ...chunk.metadata,
      chunk_count: chunks.length,
    },
  }));
}

/**
 * Create a single chunk with YAML frontmatter
 */
function createChunk(
  content: string,
  metadata: ChunkMetadata,
  chunkIndex: number,
  chunkCount: number
): ContentChunk {
  return {
    content: createChunkContent(content, metadata, chunkIndex, chunkCount),
    chunkIndex,
    chunkCount,
    metadata: {
      ...metadata,
      chunk_index: chunkIndex,
      chunk_count: chunkCount,
    },
  };
}

/**
 * Create chunk content with YAML frontmatter
 */
function createChunkContent(
  content: string,
  metadata: ChunkMetadata,
  chunkIndex: number,
  chunkCount: number
): string {
  const frontmatter = `---
title: '${escapeYamlString(metadata.title)}'
author: ${metadata.author}
url: ${metadata.url}
published: '${metadata.published}'
chunk_index: ${chunkIndex}
chunk_count: ${chunkCount}
source: ${metadata.source}
---`;

  return `${frontmatter}\n${content}`;
}

/**
 * Escape special characters in YAML strings
 */
function escapeYamlString(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Calculate word count
 */
export function getWordCount(content: string): number {
  return content.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Estimate number of chunks for given content
 */
export function estimateChunkCount(content: string): number {
  const wordCount = getWordCount(content);
  if (wordCount <= TARGET_CHUNK_WORDS) return 1;

  const stepSize = TARGET_CHUNK_WORDS - OVERLAP_WORDS;
  return Math.ceil((wordCount - OVERLAP_WORDS) / stepSize);
}
