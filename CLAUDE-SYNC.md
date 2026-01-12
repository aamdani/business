# Newsletter Sync System

This document covers how to sync external newsletter content (primarily Nate's Substack) into the Pinecone vector database for semantic search.

## Overview

The sync system fetches full post content from Substack using Chrome DevTools Protocol (CDP), extracts text and links, generates embeddings, and stores everything in Pinecone with full metadata.

**Why CDP?** Substack RSS feeds only provide preview content. Full posts require authenticated browser access. CDP lets us use an existing logged-in Chrome session to fetch complete content.

## Prerequisites

### 1. Chrome with Remote Debugging

Start Chrome with CDP enabled (this creates a separate profile so it doesn't affect your main browser):

```bash
open -na "Google Chrome" --args \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-substack-profile"
```

### 2. Log into Substack

In the Chrome window that opens:
1. Go to https://substack.com/sign-in
2. Log in with your Substack account
3. Ensure you have access to the newsletters you want to sync

### 3. Verify CDP is Running

```bash
curl http://127.0.0.1:9222/json/version
```

Should return JSON with Chrome version info.

## Manual Sync

### Sync New Posts Only

```bash
# Dry run - see what would be synced
npx tsx scripts/sync-nate-full.ts --dry-run

# Actually sync new posts
npx tsx scripts/sync-nate-full.ts
```

### Sync with Limits

```bash
# Sync up to 10 new posts
npx tsx scripts/sync-nate-full.ts --limit 10

# Sync up to 50 posts
npx tsx scripts/sync-nate-full.ts --limit 50
```

### Force Re-sync All Posts

```bash
# Re-sync everything (useful if you changed extraction logic)
npx tsx scripts/sync-nate-full.ts --force
```

## Automated Daily Sync (macOS)

The system includes a LaunchAgent for automatic daily syncing.

### Install Automation

```bash
./scripts/manage-sync-schedule.sh install
```

This installs a LaunchAgent that:
- Runs daily at 6:00 AM
- Ensures Chrome CDP is running
- Syncs any new posts
- Logs to `~/Library/Logs/content-master-pro/`

### Manage Automation

```bash
# Check if automation is installed and running
./scripts/manage-sync-schedule.sh status

# View recent sync logs
./scripts/manage-sync-schedule.sh logs

# Run sync manually (test)
./scripts/manage-sync-schedule.sh run

# Remove automation
./scripts/manage-sync-schedule.sh uninstall
```

### Important Notes

- **Chrome must be running** with CDP for the sync to work
- The LaunchAgent will attempt to start Chrome if it's not running
- You must stay logged into Substack in the CDP Chrome profile
- Session cookies typically last weeks/months, but may need to re-login occasionally

## What Gets Synced

### Content Extraction

For each post, the sync extracts:

| Field | Description |
|-------|-------------|
| `title` | Post title |
| `subtitle` | Post subtitle/description |
| `author` | Author name |
| `published` | Publication date |
| `textContent` | Full plain text content |
| `htmlContent` | Original HTML (for reference) |
| `links` | All external links with anchor text and context |

### Link Preservation

Links are extracted with full context:

```json
{
  "text": "grab my prompt tool here",
  "url": "https://www.heypresto.ai/",
  "context": "If you want to try this yourself, grab my prompt tool here and use the..."
}
```

**Typical link counts:** 40-120+ links per post (Nate links heavily to external resources)

### Chunking Strategy

- **Target chunk size:** ~800 words
- **Overlap:** 10% (80 words)
- Each chunk includes relevant links in metadata
- YAML frontmatter with source metadata

### Storage

| Location | What's Stored |
|----------|---------------|
| **Pinecone** (`nate` namespace) | Embeddings + chunk metadata (including links) |
| **Supabase** (`imported_posts`) | Full post record with all links in `metadata.links` |
| **Local** (`data/nate-posts/`) | JSON backup of each post |

## Pinecone Namespace Structure

```
content-master-pro-v2/
├── jon/      # Jon's newsletter posts
├── nate/     # Nate's newsletter posts (1,670+ vectors)
└── research/ # Research documents
```

### Check Pinecone Stats

```bash
node -e "
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(process.env.PINECONE_INDEX || 'content-master-pro-v2');
  const stats = await index.describeIndexStats();
  console.log('Namespaces:', stats.namespaces);
}
main();
"
```

## Troubleshooting

### "Chrome with CDP not running"

```bash
# Start Chrome with CDP
open -na "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-substack-profile"
```

### "Could not find article content"

The post structure may have changed. Check that:
1. You're logged in to Substack
2. The post isn't paywalled beyond your subscription level
3. The selectors in `extractFromHTML()` match the current Substack HTML

### "Timeout waiting for Page.navigate"

Increase the wait time in `sync-nate-full.ts`:
```typescript
// In fetchPage(), increase the sleep
await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds
```

### Posts showing 0 links

If a post shows 0 links but should have many:
1. Check the HTML is being fetched correctly
2. Verify the `article` selector is finding content
3. Look at the saved JSON in `data/nate-posts/` to debug

## Script Reference

| Script | Purpose |
|--------|---------|
| `scripts/sync-nate-full.ts` | Main sync script - fetches, extracts, embeds, stores |
| `scripts/daily-sync.sh` | Shell wrapper for automation (handles Chrome startup) |
| `scripts/manage-sync-schedule.sh` | Install/manage macOS LaunchAgent |
| `scripts/com.contentmasterpro.sync.plist` | LaunchAgent configuration |

## Configuration

### RSS Feed URL

The private RSS feed URL is configured in `sync-nate-full.ts`:

```typescript
const NATE_RSS_FEED = "https://api.substack.com/feed/podcast/1373231/private/006bff83-3046-44b5-8eae-9f7e2f3d3752.rss";
```

### Chunking Parameters

```typescript
const CHUNK_SIZE = 800;    // words per chunk
const CHUNK_OVERLAP = 80;  // 10% overlap
```

### Output Directories

```typescript
const OUTPUT_DIR = path.join(__dirname, "..", "data", "nate-posts");
const NAMESPACE = "nate";
```

## Adding Another Newsletter

To sync a different Substack newsletter:

1. **Get the RSS feed URL** from the newsletter's settings or by inspecting network requests
2. **Copy `sync-nate-full.ts`** to a new file (e.g., `sync-other-full.ts`)
3. **Update the constants:**
   - `NATE_RSS_FEED` → new feed URL
   - `NAMESPACE` → new namespace (e.g., "other")
   - `OUTPUT_DIR` → new output directory
4. **Update the HTML extraction** if the newsletter has different structure
5. **Add the namespace** to `pinecone_namespaces` table in Supabase
