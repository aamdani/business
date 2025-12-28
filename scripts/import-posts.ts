/**
 * Post Import Script
 *
 * Imports posts from Jon's and Nate's Substack archives into Pinecone
 * vector database for semantic search.
 *
 * Usage:
 *   npx tsx scripts/import-posts.ts --source jon
 *   npx tsx scripts/import-posts.ts --source nate
 *   npx tsx scripts/import-posts.ts --source all
 *   npx tsx scripts/import-posts.ts --source jon --dry-run
 */

import { Pinecone } from '@pinecone-database/pinecone';
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { config } from 'dotenv';

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'content-master-pro';

const PATHS = {
  jon: '/Users/jonathanedwards/AUTOMATION/SubStack/JONS_SUBSTACK/Published',
  nate: '/Users/jonathanedwards/AUTOMATION/SubStack/nate_substack/Natesnewsletter',
};

const NAMESPACES = {
  jon: 'jon-substack',
  nate: 'nate-substack',
};

const EMBEDDING_MODEL = 'multilingual-e5-large';
const BATCH_SIZE = 10; // Process 10 posts at a time for embeddings
const MAX_CONTENT_LENGTH = 8000; // Truncate content for embedding

interface PostData {
  id: string;
  source: 'jon_substack' | 'nate_substack';
  title: string;
  subtitle?: string;
  content: string;
  url?: string;
  slug?: string;
  publishedAt?: Date;
  author: string;
  filePath: string;
}

interface ParsedFrontmatter {
  title?: string;
  subtitle?: string;
  date?: string;
  published?: string;
  url?: string;
  slug?: string;
  author?: string;
}

// Parse command line arguments
function parseArgs(): { source: 'jon' | 'nate' | 'all'; dryRun: boolean } {
  const args = process.argv.slice(2);
  let source: 'jon' | 'nate' | 'all' = 'all';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      const s = args[i + 1].toLowerCase();
      if (s === 'jon' || s === 'nate' || s === 'all') {
        source = s;
      }
      i++;
    }
    if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { source, dryRun };
}

// Parse a markdown file with frontmatter
function parseMarkdownFile(filePath: string, source: 'jon' | 'nate'): PostData | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    const frontmatter = data as ParsedFrontmatter;

    if (!frontmatter.title) {
      console.warn(`  Skipping ${path.basename(filePath)}: No title found`);
      return null;
    }

    // Generate ID from source and slug/filename
    const slug = frontmatter.slug || path.basename(filePath, '.md');
    const id = `${source}_${slug}`;

    // Parse date
    let publishedAt: Date | undefined;
    if (frontmatter.date) {
      publishedAt = new Date(frontmatter.date);
    } else if (frontmatter.published) {
      publishedAt = new Date(frontmatter.published);
    }

    return {
      id,
      source: source === 'jon' ? 'jon_substack' : 'nate_substack',
      title: frontmatter.title,
      subtitle: frontmatter.subtitle,
      content: cleanContent(content),
      url: frontmatter.url,
      slug,
      publishedAt,
      author: source === 'jon' ? 'Jonathan Edwards' : (frontmatter.author || 'Nate'),
      filePath,
    };
  } catch (error) {
    console.error(`  Error parsing ${filePath}:`, error);
    return null;
  }
}

// Clean content for embedding
function cleanContent(content: string): string {
  return content
    // Remove markdown images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove markdown links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove horizontal rules
    .replace(/^\*\s*\*\s*\*\s*$/gm, '')
    .replace(/^-{3,}$/gm, '')
    // Remove excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Truncate content for embedding
function truncateForEmbedding(content: string): string {
  if (content.length <= MAX_CONTENT_LENGTH) {
    return content;
  }
  // Truncate at word boundary
  const truncated = content.slice(0, MAX_CONTENT_LENGTH);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated;
}

// Get all markdown files from a directory
function getMarkdownFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return [];
  }

  const files = fs.readdirSync(dirPath);
  return files
    .filter(f => f.endsWith('.md') && !f.startsWith('.'))
    .map(f => path.join(dirPath, f));
}

// Main import function
async function importPosts(source: 'jon' | 'nate' | 'all', dryRun: boolean) {
  console.log(`\n🚀 Starting post import (source: ${source}, dry-run: ${dryRun})\n`);

  // Initialize Pinecone client
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  console.log(`📍 Using Pinecone index: ${PINECONE_INDEX}`);

  const index = pinecone.index(PINECONE_INDEX);

  // Collect all posts to import
  const allPosts: PostData[] = [];
  const sources: ('jon' | 'nate')[] = source === 'all' ? ['jon', 'nate'] : [source];

  for (const src of sources) {
    console.log(`\n📂 Reading posts from ${src}...`);
    const dirPath = PATHS[src];
    const files = getMarkdownFiles(dirPath);
    console.log(`   Found ${files.length} markdown files`);

    let parsed = 0;
    for (const file of files) {
      const post = parseMarkdownFile(file, src);
      if (post) {
        allPosts.push(post);
        parsed++;
      }
    }
    console.log(`   Successfully parsed ${parsed} posts`);
  }

  console.log(`\n📊 Total posts to import: ${allPosts.length}`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be made\n');
    console.log('Sample posts:');
    allPosts.slice(0, 5).forEach(p => {
      console.log(`  - ${p.title} (${p.source})`);
      console.log(`    ID: ${p.id}`);
      console.log(`    Content length: ${p.content.length} chars`);
    });
    return;
  }

  // Process in batches
  let totalUpserted = 0;

  for (let i = 0; i < allPosts.length; i += BATCH_SIZE) {
    const batch = allPosts.slice(i, i + BATCH_SIZE);
    console.log(`\n⏳ Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allPosts.length / BATCH_SIZE)} (${batch.length} posts)...`);

    // Create embeddings for this batch
    const textsToEmbed = batch.map(p => {
      const textForEmbedding = `${p.title}\n\n${p.subtitle || ''}\n\n${truncateForEmbedding(p.content)}`;
      return textForEmbedding;
    });

    try {
      // Generate embeddings using Pinecone Inference
      console.log('   Generating embeddings...');
      const embeddings = await pinecone.inference.embed(
        EMBEDDING_MODEL,
        textsToEmbed,
        { inputType: 'passage', truncate: 'END' }
      );

      // Prepare vectors for upsert
      const vectors = batch.map((post, idx) => {
        const embedding = embeddings.data[idx];
        if (!("values" in embedding)) {
          throw new Error(`Expected dense embedding with values for post: ${post.id}`);
        }
        return {
          id: post.id,
          values: embedding.values,
          metadata: {
            title: post.title,
            subtitle: post.subtitle || '',
            author: post.author,
            source: post.source,
            url: post.url || '',
            published_at: post.publishedAt?.toISOString() || '',
            content_preview: post.content.slice(0, 500),
          },
        };
      });

      // Upsert to Pinecone (separate by namespace)
      for (const src of sources) {
        const namespace = NAMESPACES[src];
        const srcVectors = vectors.filter(v =>
          v.metadata.source === (src === 'jon' ? 'jon_substack' : 'nate_substack')
        );

        if (srcVectors.length > 0) {
          console.log(`   Upserting ${srcVectors.length} vectors to namespace '${namespace}'...`);
          await index.namespace(namespace).upsert(srcVectors);
          totalUpserted += srcVectors.length;
        }
      }

    } catch (error) {
      console.error('   Batch error:', error);
    }

    // Rate limit protection
    if (i + BATCH_SIZE < allPosts.length) {
      console.log('   Waiting 1s before next batch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Vectors upserted to Pinecone: ${totalUpserted}`);
}

// Run
const { source, dryRun } = parseArgs();
importPosts(source, dryRun).catch(console.error);
