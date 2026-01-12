/**
 * Sync Nate's Full Posts to Pinecone
 *
 * This script:
 * 1. Fetches post URLs from Nate's private RSS feed
 * 2. Uses CDP to fetch full HTML content (preserving links)
 * 3. Extracts text for embeddings + links as metadata
 * 4. Chunks the content
 * 5. Generates embeddings via Vercel AI Gateway
 * 6. Upserts to Pinecone under the "nate" namespace
 * 7. Records sync status in Supabase
 *
 * Prerequisites:
 * - Chrome running with --remote-debugging-port=9222
 * - Logged into Substack in that Chrome instance
 *
 * Usage:
 *   npx tsx scripts/sync-nate-full.ts                 # Sync new posts
 *   npx tsx scripts/sync-nate-full.ts --limit 5      # Sync up to 5 new posts
 *   npx tsx scripts/sync-nate-full.ts --force        # Re-sync all posts
 *   npx tsx scripts/sync-nate-full.ts --dry-run      # Preview without changes
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { Pinecone } from "@pinecone-database/pinecone";
import { JSDOM } from "jsdom";
import WebSocket from "ws";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

// Constants
const NATE_RSS_FEED = "https://api.substack.com/feed/podcast/1373231/private/006bff83-3046-44b5-8eae-9f7e2f3d3752.rss";
const OUTPUT_DIR = path.join(__dirname, "..", "data", "nate-posts");
const NAMESPACE = "nate";
const EMBEDDING_MODEL = "text-embedding-3-large";
const CHUNK_SIZE = 800; // words
const CHUNK_OVERLAP = 80; // 10% overlap
const CDP_PORT = 9222;

// Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase credentials in .env.local");
  }
  return createClient(url, key);
}

// Pinecone client
function getPinecone() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing PINECONE_API_KEY in .env.local");
  }
  return new Pinecone({ apiKey });
}

interface RSSItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  creator: string;
}

interface ExtractedLink {
  text: string;
  url: string;
  context?: string; // surrounding text
}

interface PostData {
  title: string;
  subtitle?: string;
  author: string;
  published: string;
  url: string;
  slug: string;
  textContent: string;
  htmlContent: string;
  links: ExtractedLink[];
}

interface ContentChunk {
  id: string;
  content: string;
  metadata: {
    title: string;
    author: string;
    url: string;
    published: string;
    source: string;
    chunk_index: number;
    chunk_count: number;
    namespace: string;
    links?: string; // JSON stringified links in this chunk
  };
}

/**
 * CDP Client for Chrome DevTools Protocol
 */
class CDPClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private responseHandlers: Map<number, { resolve: Function; reject: Function }> = new Map();

  async connect(): Promise<void> {
    // Get WebSocket URL from Chrome
    const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
    const data = await response.json();
    const wsUrl = data.webSocketDebuggerUrl;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.on("open", () => resolve());
      this.ws.on("error", reject);
      this.ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id && this.responseHandlers.has(msg.id)) {
          const handler = this.responseHandlers.get(msg.id)!;
          this.responseHandlers.delete(msg.id);
          if (msg.error) {
            handler.reject(new Error(msg.error.message));
          } else {
            handler.resolve(msg.result);
          }
        }
      });
    });
  }

  async send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    if (!this.ws) throw new Error("Not connected");
    
    const id = ++this.messageId;
    const message: any = { id, method, params };
    if (sessionId) {
      message.sessionId = sessionId;
    }
    
    return new Promise((resolve, reject) => {
      this.responseHandlers.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(message));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.responseHandlers.has(id)) {
          this.responseHandlers.delete(id);
          reject(new Error(`Timeout waiting for ${method}`));
        }
      }, 30000);
    });
  }

  async fetchPage(url: string): Promise<string> {
    // Create a new target (tab)
    const { targetId } = await this.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await this.send("Target.attachToTarget", { targetId, flatten: true });

    try {
      // Enable page events on the session
      await this.send("Page.enable", {}, sessionId);
      
      // Navigate to URL
      await this.send("Page.navigate", { url }, sessionId);
      
      // Wait for load
      await new Promise((resolve) => setTimeout(resolve, 4000));
      
      // Get HTML
      const result = await this.send("Runtime.evaluate", {
        expression: "document.documentElement.outerHTML",
        returnByValue: true,
      }, sessionId);
      
      return result.result.value;
    } finally {
      // Close the tab
      try {
        await this.send("Target.closeTarget", { targetId });
      } catch {
        // Ignore close errors
      }
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Parse RSS feed to get post URLs
 */
async function fetchPostUrls(): Promise<RSSItem[]> {
  console.log("📡 Fetching RSS feed...");

  const response = await fetch(NATE_RSS_FEED, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ContentMasterPro/1.0)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }

  const xml = await response.text();
  const items: RSSItem[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const getTag = (tag: string): string => {
      const patterns = [
        new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`),
        new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`),
        new RegExp(`<dc:${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></dc:${tag}>`),
      ];

      for (const pattern of patterns) {
        const tagMatch = itemXml.match(pattern);
        if (tagMatch) return tagMatch[1].trim();
      }
      return "";
    };

    items.push({
      title: getTag("title"),
      link: getTag("link"),
      guid: getTag("guid"),
      pubDate: getTag("pubDate"),
      creator: getTag("creator"),
    });
  }

  console.log(`   Found ${items.length} posts in RSS feed`);
  return items;
}

/**
 * Check which posts are already synced in Supabase
 */
async function getExistingSyncedUrls(supabase: ReturnType<typeof getSupabase>): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("imported_posts")
    .select("url")
    .eq("source", "nate_substack");

  if (error) {
    console.warn("⚠️ Could not fetch existing posts:", error.message);
    return new Set();
  }

  return new Set((data || []).map((p) => p.url).filter(Boolean));
}

/**
 * Extract text content and links from HTML
 */
function extractFromHTML(html: string, url: string): PostData | null {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Find the article content
  const article = doc.querySelector("article") || 
                  doc.querySelector(".post-content") || 
                  doc.querySelector(".body");
  
  if (!article) {
    console.warn("   ⚠️ Could not find article content");
    return null;
  }

  // Extract title
  const titleEl = doc.querySelector("h1.post-title") || doc.querySelector("h1");
  const title = titleEl?.textContent?.trim() || "";

  // Extract subtitle
  const subtitleEl = doc.querySelector(".subtitle") || doc.querySelector("h2.subtitle");
  const subtitle = subtitleEl?.textContent?.trim() || "";

  // Extract author
  const authorEl = doc.querySelector(".author-name") || doc.querySelector("[class*='author'] a");
  const author = authorEl?.textContent?.trim() || "Nate";

  // Extract publish date
  const dateEl = doc.querySelector("time[datetime]") || doc.querySelector("time");
  const published = dateEl?.getAttribute("datetime") || 
                   dateEl?.textContent?.trim() || 
                   new Date().toISOString();

  // Extract slug from URL
  const slug = url.split("/").pop()?.replace(/\.html$/, "") || "";

  // Extract all links with context
  const links: ExtractedLink[] = [];
  const linkElements = article.querySelectorAll("a[href]");
  
  linkElements.forEach((el) => {
    const href = el.getAttribute("href");
    const text = el.textContent?.trim() || "";
    
    // Skip empty links, anchor links, and substack internal navigation
    if (!href || href.startsWith("#") || href.includes("substack.com/subscribe")) {
      return;
    }

    // Get surrounding context (parent paragraph text)
    const parent = el.closest("p") || el.parentElement;
    const context = parent?.textContent?.trim().substring(0, 200) || "";

    links.push({
      text,
      url: href,
      context,
    });
  });

  // Extract plain text content
  const textContent = article.textContent
    ?.replace(/\s+/g, " ")
    .trim() || "";

  // Get HTML content of article
  const htmlContent = article.innerHTML || "";

  return {
    title,
    subtitle,
    author,
    published,
    url,
    slug,
    textContent,
    htmlContent,
    links,
  };
}

/**
 * Chunk content into smaller pieces with overlap
 * Links that appear in each chunk are included in metadata
 */
function chunkContent(post: PostData): ContentChunk[] {
  const words = post.textContent.split(/\s+/).filter((w) => w.length > 0);

  // Find which links appear in which part of the text
  const findLinksInText = (text: string): ExtractedLink[] => {
    return post.links.filter((link) => 
      text.toLowerCase().includes(link.text.toLowerCase()) ||
      (link.context && text.includes(link.context.substring(0, 50)))
    );
  };

  if (words.length <= CHUNK_SIZE) {
    return [
      {
        id: `${post.slug}-0`,
        content: post.textContent,
        metadata: {
          title: post.title,
          author: post.author,
          url: post.url,
          published: post.published,
          source: "nate-substack",
          chunk_index: 0,
          chunk_count: 1,
          namespace: NAMESPACE,
          links: JSON.stringify(post.links),
        },
      },
    ];
  }

  const chunks: ContentChunk[] = [];
  const stepSize = CHUNK_SIZE - CHUNK_OVERLAP;
  let startIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + CHUNK_SIZE, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    const chunkText = chunkWords.join(" ");
    const chunkLinks = findLinksInText(chunkText);

    chunks.push({
      id: `${post.slug}-${chunks.length}`,
      content: chunkText,
      metadata: {
        title: post.title,
        author: post.author,
        url: post.url,
        published: post.published,
        source: "nate-substack",
        chunk_index: chunks.length,
        chunk_count: 0, // Will update after
        namespace: NAMESPACE,
        links: chunkLinks.length > 0 ? JSON.stringify(chunkLinks) : undefined,
      },
    });

    startIndex += stepSize;

    // Don't create tiny final chunks
    if (words.length - startIndex < CHUNK_OVERLAP * 2) {
      break;
    }
  }

  // Update chunk counts
  return chunks.map((chunk) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      chunk_count: chunks.length,
    },
  }));
}

/**
 * Generate embeddings using Vercel AI Gateway
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VERCEL_AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VERCEL_AI_GATEWAY_API_KEY");
  }

  const response = await fetch("https://ai-gateway.vercel.sh/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

/**
 * Upsert chunks to Pinecone
 */
async function upsertToPinecone(
  pinecone: Pinecone,
  chunks: ContentChunk[],
  embeddings: number[][]
): Promise<void> {
  const indexName = process.env.PINECONE_INDEX || "content-master-pro-v2";
  const index = pinecone.index(indexName);
  const namespace = index.namespace(NAMESPACE);

  const vectors = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: {
      ...chunk.metadata,
      content: chunk.content.substring(0, 1000), // Store preview in metadata
    },
  }));

  // Upsert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await namespace.upsert(batch);
    console.log(`   📤 Upserted ${Math.min(i + batchSize, vectors.length)}/${vectors.length} vectors`);
  }
}

/**
 * Get user ID from sync manifest or environment
 */
async function getUserId(supabase: ReturnType<typeof getSupabase>): Promise<string> {
  // First try to get from existing nate_substack manifest
  const { data: manifest } = await supabase
    .from("sync_manifests")
    .select("user_id")
    .eq("source", "nate_substack")
    .single();

  if (manifest?.user_id) {
    return manifest.user_id;
  }

  // Try to get from any manifest
  const { data: anyManifest } = await supabase
    .from("sync_manifests")
    .select("user_id")
    .limit(1)
    .single();

  if (anyManifest?.user_id) {
    return anyManifest.user_id;
  }

  // Fall back to environment variable
  const envUserId = process.env.SYNC_USER_ID;
  if (envUserId) {
    return envUserId;
  }

  throw new Error(
    "No user_id found. Either create a sync_manifest for nate_substack, " +
      "or set SYNC_USER_ID in .env.local"
  );
}

/**
 * Record sync in Supabase
 */
async function recordSync(
  supabase: ReturnType<typeof getSupabase>,
  post: PostData,
  chunkCount: number,
  userId: string
): Promise<void> {
  // Check if post already exists
  const { data: existing } = await supabase
    .from("imported_posts")
    .select("id")
    .eq("source", "nate_substack")
    .eq("external_id", post.slug)
    .single();

  const postRecord = {
    title: post.title,
    subtitle: post.subtitle,
    content: post.textContent,
    author: post.author,
    published_at: post.published ? new Date(post.published).toISOString() : null,
    metadata: {
      namespace: NAMESPACE,
      chunk_count: chunkCount,
      synced_at: new Date().toISOString(),
      link_count: post.links.length,
      links: post.links, // Store all links in metadata
    },
  };

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("imported_posts")
      .update(postRecord)
      .eq("id", existing.id);

    if (error) {
      console.warn(`   ⚠️ Failed to update sync: ${error.message}`);
    }
  } else {
    // Insert new
    const { error } = await supabase.from("imported_posts").insert({
      user_id: userId,
      source: "nate_substack",
      external_id: post.slug,
      url: post.url,
      pinecone_id: `${post.slug}-0`,
      ...postRecord,
    });

    if (error) {
      console.warn(`   ⚠️ Failed to record sync: ${error.message}`);
    }
  }
}

/**
 * Save post to local file (for reference/backup)
 */
function savePostLocally(post: PostData): void {
  const pubDir = path.join(OUTPUT_DIR, "Natesnewsletter");
  if (!fs.existsSync(pubDir)) {
    fs.mkdirSync(pubDir, { recursive: true });
  }

  const dateStr = new Date(post.published).toISOString().split("T")[0];
  const filename = `${dateStr}-${post.slug}.json`;
  const filePath = path.join(pubDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(post, null, 2));
}

/**
 * Parse command line arguments
 */
function parseArgs(): { limit: number; force: boolean; dryRun: boolean } {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let force = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--force") {
      force = true;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  return { limit, force, dryRun };
}

/**
 * Check if Chrome with CDP is running
 */
async function checkCDP(): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Main sync function
 */
async function main() {
  const { limit, force, dryRun } = parseArgs();
  const startTime = Date.now();

  console.log("\n🚀 Nate's Substack Full Sync\n");
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`   Force: ${force ? "Yes (re-sync all)" : "No (new only)"}`);
  console.log(`   Limit: ${limit === Infinity ? "None" : limit}\n`);

  // Check CDP
  const cdpRunning = await checkCDP();
  if (!cdpRunning) {
    console.error("❌ Chrome with CDP not running!");
    console.error("   Start Chrome with:");
    console.error('   open -na "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-substack-profile"');
    process.exit(1);
  }
  console.log("✅ Chrome CDP connection verified\n");

  // Initialize clients
  const supabase = getSupabase();
  const pinecone = getPinecone();

  // Get user ID for database records
  const userId = await getUserId(supabase);
  console.log(`📌 Using user_id: ${userId.substring(0, 8)}...\n`);

  // Fetch RSS and existing syncs
  const rssItems = await fetchPostUrls();
  const existingUrls = force ? new Set<string>() : await getExistingSyncedUrls(supabase);

  // Filter to new posts
  const newItems = rssItems.filter((item) => !existingUrls.has(item.link));
  const itemsToSync = newItems.slice(0, limit);

  console.log(`\n📊 Sync Status:`);
  console.log(`   Total posts in feed: ${rssItems.length}`);
  console.log(`   Already synced: ${existingUrls.size}`);
  console.log(`   New posts: ${newItems.length}`);
  console.log(`   Will sync: ${itemsToSync.length}\n`);

  if (itemsToSync.length === 0) {
    console.log("✅ All posts already synced!\n");
    return;
  }

  if (dryRun) {
    console.log("📋 Posts that would be synced:");
    itemsToSync.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.title}`);
      console.log(`      ${item.link}`);
    });
    console.log("\n🏁 Dry run complete\n");
    return;
  }

  // Connect to CDP
  const cdp = new CDPClient();
  await cdp.connect();
  console.log("🔌 Connected to Chrome CDP\n");

  // Sync each post
  let successCount = 0;
  let failCount = 0;
  let totalChunks = 0;
  let totalLinks = 0;

  for (let i = 0; i < itemsToSync.length; i++) {
    const item = itemsToSync[i];
    console.log(`\n[${i + 1}/${itemsToSync.length}] ${item.title}`);

    try {
      // Fetch full HTML via CDP
      console.log(`   🔗 Fetching: ${item.link}`);
      const html = await cdp.fetchPage(item.link);
      console.log(`   ✅ Got ${html.length} chars of HTML`);

      // Extract content and links
      const post = extractFromHTML(html, item.link);
      if (!post) {
        failCount++;
        continue;
      }

      console.log(`   📄 Extracted ${post.textContent.length} chars of text`);
      console.log(`   🔗 Found ${post.links.length} links`);

      // Save locally for reference
      savePostLocally(post);

      // Chunk content
      const chunks = chunkContent(post);
      console.log(`   📄 Created ${chunks.length} chunks`);

      // Generate embeddings
      console.log(`   🧠 Generating embeddings...`);
      const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

      // Upsert to Pinecone
      console.log(`   📤 Upserting to Pinecone...`);
      await upsertToPinecone(pinecone, chunks, embeddings);

      // Record in Supabase
      await recordSync(supabase, post, chunks.length, userId);

      successCount++;
      totalChunks += chunks.length;
      totalLinks += post.links.length;
      console.log(`   ✅ Done!`);

      // Small delay to be nice to Substack
      if (i < itemsToSync.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Error: ${message}`);
      failCount++;
    }
  }

  // Cleanup
  cdp.close();

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 Sync Complete!`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Success: ${successCount} posts`);
  console.log(`   Failed: ${failCount} posts`);
  console.log(`   Total chunks: ${totalChunks}`);
  console.log(`   Total links extracted: ${totalLinks}`);
  console.log(`   Namespace: ${NAMESPACE}`);
  console.log(`${"=".repeat(50)}\n`);
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error.message);
  process.exit(1);
});
