# Content Master Pro - Implementation Plan

> **Created**: 2025-12-27
> **Status**: ✅ ALL FEATURES IMPLEMENTED
> **Purpose**: Persistent planning document to survive context resets
> **Mode**: Full auto - burn tokens, ship features

---

## 🤖 Autonomous Build Log

This section is updated in real-time as features are implemented.

### Build Session: 2025-12-27

| Time | Action | Status |
|------|--------|--------|
| Started | Autonomous build mode activated | ✅ |
| | Substack sync research completed | ✅ |
| | Built Prompts page (Rule 4 priority) | ✅ |
| | Built Settings page | ✅ |
| | Built History page | ✅ |
| | Enhanced Dashboard with stats | ✅ |
| | Built Sync page with RSS fetching | ✅ |
| | Created sync API route | ✅ |
| | Set up daily cron job | ✅ |

### Completed This Session
- **Prompts page** (`/prompts`): Full CRUD, version history, model selection, preview interpolation
- **Settings page** (`/settings`): Grouped by category, sliders for temps, model dropdowns, inline save
- **History page** (`/history`): Session list, status filters, continue/view/generate more, delete confirmation
- **Dashboard** (`/dashboard`): Enhanced with stats (active/completed sessions, posts indexed, outputs), recent 5 sessions, quick actions
- **Sync page** (`/sync`): Add newsletters, view synced posts, manual sync trigger, cookie auth for paywalled content
- **Sync API** (`/api/sync`): Fetches RSS, parses XML, stores in imported_posts, vectorizes to Pinecone
- **Cron job** (`/api/cron/sync`): Daily auto-sync at 6 AM, configured in vercel.json
- **Components added**: alert-dialog, collapsible, select (via shadcn)
- **Research**: Complete findings on Substack sync methods (RSS has full content!)

### Research Findings: Substack Sync

**Key Discovery**: RSS feeds include FULL HTML content (22k+ chars) in `<content:encoded>` tag.

| Content Type | Method | Auth Required |
|--------------|--------|---------------|
| Free posts | RSS feed | None |
| Paywalled posts | RSS + session cookie | `substack.sid` cookie |

**Implementation**:
1. Edge Function fetches RSS feed XML
2. Parse XML, extract `<content:encoded>`
3. For paywalled: include `substack.sid` cookie in request
4. User pastes cookie from browser DevTools (valid 3 months)
5. Store in `imported_posts`, vectorize to Pinecone

---

## Project Overview

Content Master Pro transforms brain dumps into multi-platform deliverables using AI. The app follows a pipeline: Brain Dump → Research → Outline → Draft → Outputs (YouTube, TikTok, Images).

## Current State

### Completed Features

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | Done | Supabase auth with login/signup |
| Dashboard | Done | Basic landing page |
| Create (Brain Dump) | Done | Full pipeline entry point |
| Research | Done | Perplexity-powered research |
| Outline | Done | AI-generated outlines |
| Draft | Done | AI draft writer with voice checking |
| Outputs | Done | YouTube, TikTok, Images tabs |
| Image Generation | Done | Vercel AI SDK with Gemini 3 Pro Image |
| Search | Done | Pinecone semantic search across Jon's and Nate's posts |

### All Features Complete

Every page in the sidebar now works:

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| **Dashboard** | `/dashboard` | ✅ Done | Stats, recent sessions, quick actions |
| **Create** | `/create` | ✅ Done | Brain dump entry point |
| **Search** | `/search` | ✅ Done | Pinecone semantic search |
| **History** | `/history` | ✅ Done | Session list, filters, actions |
| **Prompts** | `/prompts` | ✅ Done | Full CRUD, versions, preview |
| **Sync** | `/sync` | ✅ Done | RSS sync, auto-sync cron |
| **Settings** | `/settings` | ✅ Done | Grouped settings, model dropdowns |

---

## User Decisions (from Q&A session 2025-12-27)

| Question | Decision |
|----------|----------|
| App scope | **Single-tenant** - just for Jon, no multi-user complexity |
| Prompt versioning | **Keep last 5 versions** - rolling history with rollback |
| Prompt "test" button | **Preview only** - show interpolated text, no AI call |
| History sessions | **Full flexibility** - continue, view, or generate new assets |
| Settings usage | **Frequent experimentation** - needs easy access |
| Sync scope | **Any newsletter URL** - generic, not just Jon/Nate |
| Paywall auth | **Cookie/token paste OR OAuth** - research both options |
| Sync trigger | **Auto-sync daily** + manual trigger (needs cron job) |
| Sync content | **Everything** - title, body, images, links (same as local) |
| Dashboard | **All features** - stats, recent sessions, quick create |

---

## Feature Specifications

### 1. Dashboard Page (`/dashboard`) - ENHANCE

**Current State**: Basic landing page

**Enhancements Needed**:
1. **Quick Stats**: Post counts, sync status, recent activity
2. **Recent Sessions**: Last 5 sessions with quick-jump links
3. **Create New**: Prominent button to start new brain dump

---

### 2. History Page (`/history`)

**Purpose**: View and manage past content creation sessions.

**Data Source**: `content_sessions` table

**User Decision**: Full flexibility - continue, view, OR generate new assets from old sessions

**UI Requirements**:
- List view of all sessions with status badges
- Filter by status (draft, research, outline, writing, published)
- Click to open session with options:
  - **Continue** - resume at current pipeline stage
  - **View** - read-only view of all outputs
  - **Generate More** - create additional assets from same content
- Delete/archive old sessions
- Show pipeline progress (which stages completed)

**Related Tables**:
- `content_sessions` - session metadata
- `content_brain_dumps` - the raw input
- `content_research` - research output
- `content_outlines` - outline data
- `content_drafts` - draft content
- `content_outputs` - final deliverables

---

### 3. Prompts Page (`/prompts`) - REQUIRED BY RULE 4

**Purpose**: Database-driven prompt management UI.

**Why Critical**: CLAUDE.md Rule 4 explicitly states:
> "Every prompt must be editable through a web UI"

**User Decisions**:
- Single-tenant (no role-based access needed)
- Keep last 5 versions (rolling history)
- "Test" = preview interpolated text only (no AI call)

**Data Sources**:
- `prompt_sets` - Groups prompts by purpose
- `prompt_versions` - Versioned content with status (draft/active/archived)
- `ai_models` - Available models for assignment

**UI Requirements**:
1. List all prompt sets with current active version
2. Click to edit - full-screen editor with syntax highlighting
3. Model selection dropdown (from `ai_models`)
4. **Preview button**: Shows interpolated prompt with sample variables
5. Save creates new version, auto-archives versions beyond 5
6. Version history sidebar - click to view/restore old versions

**Prompt Sets (from seed data)**:
- `brain_dump_parser`
- `research_generator`
- `outline_generator`
- `draft_writer`
- `voice_checker`
- `headline_generator`
- `image_prompt_generator`

---

### 4. Sync Page (`/sync`)

**Purpose**: Import posts from ANY Substack newsletter into the database for semantic search.

**User Decisions**:
- Generic sync - any newsletter URL, not just Jon/Nate
- Daily auto-sync + manual trigger
- Capture everything: title, body, images, links
- Auth via cookie/token paste OR OAuth (research needed)

**Data Sources**:
- `imported_posts` - Stores imported content
- `sync_manifests` - Tracks sync status

**CRITICAL REQUIREMENT**: Must work remotely (not just on local machine)

The sync feature CANNOT rely on local file access (`/Users/jonathanedwards/...`). It must pull content directly from Substack so it works when:
- App is deployed to Vercel
- User logs in from any computer
- Running in production environment

---

#### RESEARCH NEEDED: Remote Substack Sync

**Problem**: How do we pull Substack content from the web app without local file access?

**Known Data Sources**:
| Source | URL Pattern | Auth Required | Notes |
|--------|-------------|---------------|-------|
| RSS Feed | `newsletter.substack.com/feed` | No (public posts only) | Structured XML, easy to parse |
| Sitemap | `newsletter.substack.com/sitemap.xml` | No | All post URLs, but not content |
| Archive Page | `newsletter.substack.com/archive` | No | HTML, paginated |
| Substack API | Unknown | Unknown | Need to research if public API exists |

**Research Questions**:
1. Does Substack have a public API for fetching post content?
2. Can we use RSS feeds for full post content or just excerpts?
3. How do we handle paywalled content (paid newsletters)?
4. What authentication methods are available (OAuth, API keys)?
5. Are there rate limits we need to respect?
6. Can we use the user's Substack session cookie/token for paywalled content?

**Potential Approaches**:

| Approach | Pros | Cons |
|----------|------|------|
| **RSS Feed** | Easy, structured, no auth | Public posts only, may have excerpts |
| **Web Scraping** | Full content access | Fragile, ToS concerns, paywalled blocked |
| **Substack API** | Official, reliable | May not exist publicly |
| **User Cookie/Token** | Access to paid content | User pastes from browser dev tools |
| **OAuth (if available)** | Clean auth flow | May not exist |

**Action Items**:
- [ ] Research Substack's official API documentation
- [ ] Test RSS feed content completeness for public posts
- [ ] Investigate how substack2md handles authentication
- [ ] Check if Substack supports OAuth for third-party apps
- [ ] Test cookie injection approach for paywalled content
- [ ] Look into Substack's developer/partner program

---

**UI Requirements**:
1. **Add Newsletter**: Input field for any newsletter URL
2. **Newsletter List**: All configured newsletters with sync status
3. **Sync Status**: Last sync time, post count, error messages
4. **Sync Now**: Manual trigger button per newsletter
5. **Auth Config**: Paste cookie/token for paywalled newsletters
6. **Auto-Sync Toggle**: Enable/disable daily sync per newsletter

**Technical Requirements**:
- Daily cron job (Supabase pg_cron or Vercel cron)
- Edge Function for fetching/parsing Substack content
- Pinecone integration for vectorizing content

**Sync Process** (once research is complete):
1. Fetch posts from Substack (method TBD based on research)
2. Parse content, metadata, and download images
3. Insert into `imported_posts` table
4. Generate embeddings via Edge Function
5. Store vectors in Pinecone
6. Update `sync_manifests` with status

**Note**: The Search page already works with Pinecone, so Sync populates the data that Search queries.

---

### 5. Settings Page (`/settings`)

**Purpose**: Manage configurable app settings.

**User Decision**: Frequent experimentation - needs easy access and good UX

**Data Source**: `app_settings` table

**Existing Settings (from migration 000012)**:

| Category | Key | Default |
|----------|-----|---------|
| edge_function | parse_brain_dump_max_themes | 5 |
| edge_function | parse_brain_dump_model | anthropic/claude-sonnet-4-5 |
| edge_function | generate_research_model | perplexity/sonar-pro |
| edge_function | generate_research_temperature | 0.3 |
| edge_function | generate_research_max_tokens | 4096 |
| edge_function | generate_outlines_model | anthropic/claude-sonnet-4-5 |
| edge_function | generate_outlines_min_sections | 3 |
| edge_function | generate_outlines_max_sections | 6 |
| edge_function | generate_outlines_temperature | 0.7 |
| edge_function | draft_writer_model | anthropic/claude-sonnet-4-5 |
| edge_function | draft_writer_target_words | 1500 |
| edge_function | draft_writer_temperature | 0.8 |
| edge_function | voice_checker_model | anthropic/claude-haiku-4-5 |
| edge_function | voice_checker_threshold | 0.7 |
| edge_function | headline_generator_model | anthropic/claude-sonnet-4-5 |
| edge_function | headline_generator_count | 5 |
| edge_function | image_generator_model | google/gemini-3-pro-image |
| edge_function | image_generator_fallback_model | openai/dall-e-3 |
| general | default_output_formats | ["substack", "youtube", "tiktok"] |
| general | max_sessions_per_user | 100 |
| general | ai_call_log_retention_days | 30 |

**UI Requirements**:
1. **Grouped by category**: Collapsible sections for edge_function, general
2. **Inline editing**: Click to edit, immediate save
3. **Model dropdowns**: Populated from `ai_models` table
4. **Sliders for temperatures**: 0.0 - 1.0 with live preview
5. **Input validation**: Numbers, JSON arrays with error messages
6. **Quick access**: Settings should be easy to find and modify

---

## Database Schema Reference

### Prompt Management

```sql
-- prompt_sets: Groups prompts by purpose
CREATE TABLE prompt_sets (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,    -- e.g., 'brain_dump_parser'
  name TEXT NOT NULL,           -- Display name
  description TEXT,
  created_at TIMESTAMPTZ
);

-- prompt_versions: Versioned content
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY,
  prompt_set_id UUID REFERENCES prompt_sets(id),
  version INTEGER NOT NULL,
  status TEXT NOT NULL,         -- 'draft', 'active', 'archived'
  prompt_content TEXT NOT NULL,
  model_id UUID REFERENCES ai_models(id),
  created_at TIMESTAMPTZ
);
```

### Import/Sync

```sql
-- imported_posts: Content from SubStack
CREATE TABLE imported_posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  source TEXT NOT NULL,         -- 'jon_substack', 'nate_substack'
  external_id TEXT,
  url TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  published_at TIMESTAMPTZ,
  tags TEXT[],
  pinecone_id TEXT,             -- Vector store reference
  metadata JSONB
);

-- sync_manifests: Track sync status
CREATE TABLE sync_manifests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  source TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  post_count INTEGER,
  status TEXT,                  -- 'idle', 'syncing', 'completed', 'error'
  error_message TEXT,
  sync_config JSONB
);
```

---

## Implementation Order

Based on dependencies and Rule 4 priority:

1. **Prompts** (CRITICAL - Rule 4 requirement)
2. **Settings** (Simple CRUD, enables testing other features)
3. **History** (Nice to have, improves UX)
4. **Sync Research** (BLOCKING - must complete before implementation)
5. **Sync Implementation** (Complex, requires Pinecone + remote data fetching)

### Sync Research Phase

Before implementing Sync, we need answers to:

1. **What's the best data source?**
   - Test RSS feed: `curl https://limitededitionjonathan.substack.com/feed`
   - Check if full content or just excerpts

2. **Is there an official API?**
   - Search Substack developer docs
   - Check if they have a partner/developer program

3. **How to handle paywalled content?**
   - Nate's newsletter is paid - can we access it?
   - What auth mechanisms does Substack support?

4. **What does substack2md do?**
   - Review the tool's source code
   - Understand how it handles auth with CDP browser

This research will determine the technical approach before any code is written.

---

## Files Modified This Session

- `supabase/functions/generate-image/index.ts` - Fixed to use Vercel AI SDK

## Key Technical Learnings

### Vercel AI Gateway Image Generation

Use the Vercel AI SDK, NOT direct HTTP calls:

```typescript
import { generateText, createGateway } from "https://esm.sh/ai@5.0.80";

const gateway = createGateway({
  apiKey: Deno.env.get("VERCEL_AI_GATEWAY_API_KEY"),
});

// Use generateText (NOT generateImage) for Gemini image models
const result = await generateText({
  model: gateway(modelId),
  messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  providerOptions: {
    google: { imageConfig: { aspectRatio: "16:9" } }
  }
});

// Images are in result.files
const imageFile = result.files?.find(f => f.mediaType?.startsWith("image/"));
```

---

## Next Steps

All core features are implemented. Future enhancements:

1. **Production deployment** - Deploy to Vercel, configure cron secret
2. **Add more newsletters** - Test sync with various Substack publications
3. **Chat mode for search** - Phase 3 feature placeholder in search page
4. **Analytics dashboard** - Track AI call costs, token usage
5. **Export functionality** - Download drafts as markdown/HTML

### Files Created This Session

```
src/app/(dashboard)/prompts/page.tsx     # Prompt management UI
src/app/(dashboard)/settings/page.tsx    # Settings management UI
src/app/(dashboard)/history/page.tsx     # Session history UI
src/app/(dashboard)/sync/page.tsx        # Newsletter sync UI
src/app/api/sync/route.ts                # Sync API endpoint
src/app/api/cron/sync/route.ts           # Daily cron job
src/components/ui/alert-dialog.tsx       # shadcn component
src/components/ui/collapsible.tsx        # shadcn component
src/components/ui/select.tsx             # shadcn component
vercel.json                              # Cron configuration
```

### Environment Variables Needed for Production

```bash
# Already configured
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX=content-master-pro

# Add for cron security
CRON_SECRET=your-secret-here
```
