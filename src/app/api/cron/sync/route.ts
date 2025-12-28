import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPineconeClient } from "@/lib/pinecone/client";

/**
 * Daily cron job to sync all configured newsletters
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */

interface RSSItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  creator: string;
  description: string;
  content: string;
  enclosure?: string;
}

const EMBEDDING_MODEL = "multilingual-e5-large";
const INDEX_NAME = process.env.PINECONE_INDEX || "content-master-pro";

function parseRSSFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const getTag = (tag: string): string => {
      const patterns = [
        new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`),
        new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`),
        new RegExp(`<dc:${tag}>([\\s\\S]*?)</dc:${tag}>`),
        new RegExp(`<content:${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></content:${tag}>`),
      ];

      for (const pattern of patterns) {
        const tagMatch = itemXml.match(pattern);
        if (tagMatch) return tagMatch[1].trim();
      }
      return "";
    };

    const getEnclosure = (): string | undefined => {
      const encMatch = itemXml.match(/<enclosure[^>]*url="([^"]*)"[^>]*>/);
      return encMatch ? encMatch[1] : undefined;
    };

    items.push({
      title: getTag("title"),
      link: getTag("link"),
      guid: getTag("guid"),
      pubDate: getTag("pubDate"),
      creator: getTag("creator"),
      description: getTag("description"),
      content: getTag("encoded"),
      enclosure: getEnclosure(),
    });
  }

  return items;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateEmbedding(text: string): Promise<number[]> {
  const client = getPineconeClient();
  const truncated = text.slice(0, 8000);
  const embeddings = await client.inference.embed(
    EMBEDDING_MODEL,
    [truncated],
    { inputType: "passage", truncate: "END" }
  );

  const embedding = embeddings.data[0];
  if (!("values" in embedding)) {
    throw new Error("Expected dense embedding with values");
  }
  return embedding.values;
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Array<{ source: string; synced: number; errors: number }> = [];

  try {
    const supabase = await createServiceClient();

    // Get all manifests with auto_sync enabled
    const { data: manifests, error: fetchError } = await supabase
      .from("sync_manifests")
      .select("*")
      .filter("sync_config->auto_sync", "eq", true);

    if (fetchError) {
      throw fetchError;
    }

    if (!manifests || manifests.length === 0) {
      return NextResponse.json({
        message: "No newsletters configured for auto-sync",
        duration: `${Date.now() - startTime}ms`,
      });
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(INDEX_NAME);

    for (const manifest of manifests) {
      const syncConfig = manifest.sync_config as {
        newsletter_url?: string;
        auth_cookie?: string;
      };

      if (!syncConfig?.newsletter_url) continue;

      try {
        // Update status to syncing
        await supabase
          .from("sync_manifests")
          .update({ status: "syncing", error_message: null })
          .eq("id", manifest.id);

        // Fetch RSS feed
        const headers: HeadersInit = {
          "User-Agent": "Mozilla/5.0 (compatible; ContentMasterPro/1.0)",
          "Accept": "application/rss+xml, application/xml, text/xml",
        };

        if (syncConfig.auth_cookie) {
          headers["Cookie"] = `substack.sid=${syncConfig.auth_cookie}`;
        }

        const feedResponse = await fetch(syncConfig.newsletter_url, { headers });

        if (!feedResponse.ok) {
          throw new Error(`Failed to fetch RSS: ${feedResponse.status}`);
        }

        const feedXml = await feedResponse.text();
        const items = parseRSSFeed(feedXml);

        // Get existing posts
        const { data: existingPosts } = await supabase
          .from("imported_posts")
          .select("external_id")
          .eq("source", manifest.source);

        const existingIds = new Set(existingPosts?.map((p) => p.external_id) || []);
        const newItems = items.filter((item) => !existingIds.has(item.guid || item.link));

        // Determine namespace
        const namespace = manifest.source.includes("jon") ? "jon-substack" : "nate-substack";
        const ns = index.namespace(namespace);

        let syncedCount = 0;
        let errorCount = 0;

        for (const item of newItems) {
          try {
            const plainContent = stripHtml(item.content || item.description);
            const contentPreview = plainContent.slice(0, 500);
            const embeddingText = `${item.title}\n\n${plainContent}`;
            const embedding = await generateEmbedding(embeddingText);
            const pineconeId = `${manifest.source}-${Buffer.from(item.guid || item.link).toString("base64").slice(0, 20)}`;

            await ns.upsert([
              {
                id: pineconeId,
                values: embedding,
                metadata: {
                  title: item.title,
                  author: item.creator,
                  source: manifest.source,
                  url: item.link,
                  ...(item.pubDate && { published_at: new Date(item.pubDate).toISOString() }),
                  content_preview: contentPreview,
                },
              },
            ]);

            await supabase.from("imported_posts").insert({
              user_id: manifest.user_id,
              source: manifest.source,
              external_id: item.guid || item.link,
              url: item.link,
              title: item.title,
              subtitle: item.description?.slice(0, 200),
              content: item.content || item.description,
              author: item.creator,
              ...(item.pubDate && { published_at: new Date(item.pubDate).toISOString() }),
              pinecone_id: pineconeId,
              metadata: {
                enclosure: item.enclosure,
                synced_at: new Date().toISOString(),
              },
            });

            syncedCount++;
          } catch (err) {
            console.error(`Failed to process post: ${item.title}`, err);
            errorCount++;
          }
        }

        // Update manifest
        const { count: totalCount } = await supabase
          .from("imported_posts")
          .select("*", { count: "exact", head: true })
          .eq("source", manifest.source);

        await supabase
          .from("sync_manifests")
          .update({
            status: "completed",
            last_sync_at: new Date().toISOString(),
            post_count: totalCount || manifest.post_count,
            error_message: null,
          })
          .eq("id", manifest.id);

        results.push({
          source: manifest.source,
          synced: syncedCount,
          errors: errorCount,
        });
      } catch (err) {
        console.error(`Failed to sync ${manifest.source}:`, err);

        await supabase
          .from("sync_manifests")
          .update({
            status: "error",
            error_message: err instanceof Error ? err.message : "Unknown error",
          })
          .eq("id", manifest.id);

        results.push({
          source: manifest.source,
          synced: 0,
          errors: 1,
        });
      }
    }

    const duration = Date.now() - startTime;
    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        newsletters: results.length,
        totalSynced,
        totalErrors,
        duration: `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
