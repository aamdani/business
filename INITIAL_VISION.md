# INITIAL_VISION.md

## Origin

This codebase was forked from "Limited Edition Jonathan" (a Substack peer). It's called Content Master Pro — a personal content creation platform that transforms brain dumps into multi-platform deliverables. The goal is to transform it into Ahad's unified daily business operations hub, deployed at business.g8n.ai.

---

## Part 1: Current Codebase Capabilities

### 1.1 Core Features

**Content Creation Pipeline** (5-stage):
1. Brain Dump — Write freely; AI extracts themes, suggests research queries, identifies key insights
2. Research — Perplexity-powered research with citations; search past content; add notes/commentary
3. Outline — AI generates structured outline (hook, sections, target audience, word count)
4. Draft — Full draft generation with real-time voice scoring (profanity counting, corporate-speak detection); in-app markdown editing
5. Outputs — Final deliverables by platform (Substack, YouTube, TikTok, LinkedIn, etc.)

**Semantic Search**:
- Vector search across 470+ indexed posts (Jon's and Nate's newsletters) via Pinecone
- Results View — Traditional search with relevance scores
- Chat View — Conversational AI that cites relevant posts

**News Curation (Swipe)**:
- Tinder-style card interface for reviewing AI/tech news from RSS feeds
- Swipe right to save with commentary, left to dismiss
- PWA support for mobile use

**Captures**: Saved news items with commentary, searchable and referenceable

**Content Calendar**:
- Drag-and-drop project scheduling
- Status workflow: draft → review → scheduled → published
- Project management with multiple asset types

**Project & Asset Management**:
- Asset versioning with full history and restore
- Edit locking (prevent concurrent edits)
- Publication tracking (where/when content was published)
- Asset types: post, transcript_youtube, description_youtube, prompts, guide, post_linkedin, image_substack

**Studio (Admin)**:
- Prompts — Database-driven management with versioning (draft → active → archived)
- Models — AI model configuration synced from Vercel AI Gateway
- Logs — Full audit trail of all AI calls (prompt, response, model, tokens, duration)
- Destinations — Output platform configuration with specs (aspect ratio, max duration, tone modifiers)
- Guidelines — Voice and style guidelines (brand voice, anti-corporate rules)

**Partner API**:
- REST API with key management (SHA-256 hashed)
- Rate limiting (per-minute, per-day)
- Invite system for onboarding
- Namespace-based access control (granular read/write)
- Usage tracking and analytics
- Full API documentation page

**Ideas & Slack Integration**:
- Idea capture from multiple sources (Slack, recordings, manual, X shares, Granola, Substack)
- Semantic clustering of ideas
- Status workflow: backlog → in_progress → drafted → archived
- Pinecone indexing for idea search

**PWA Support**: Installable as mobile app with service worker

### 1.2 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | React 19 |
| UI | shadcn/ui + Tailwind CSS v4 |
| Auth & DB | Supabase (PostgreSQL + Auth + Edge Functions + Storage) |
| Vector Search | Pinecone (3072-dim text-embedding-3-large) |
| AI | Vercel AI Gateway (Claude, Gemini, Perplexity, DALL-E, FLUX, Imagen) |
| Data Fetching | TanStack Query |
| Animation | Framer Motion |
| Testing | Vitest + Playwright |
| PWA | next-pwa |
| Drag & Drop | @dnd-kit |
| Markdown | react-markdown + remark-gfm |
| HTML→Markdown | Turndown |

### 1.3 Database Schema (59 migrations, 40+ tables)

**Content Pipeline**: content_sessions, content_brain_dumps, content_research, content_outlines, content_drafts, content_outputs, generated_images

**AI Configuration**: ai_models, prompt_sets, prompt_versions, prompt_variables, prompt_variable_selections, ai_call_logs, app_settings

**Content Library**: imported_posts, sync_manifests

**Voice & Brand**: voice_guidelines, brand_guidelines, destinations, prompt_guidelines

**Calendar & Projects**: nate_content_projects, nate_project_assets, nate_asset_versions, nate_project_publications

**News Curation**: changelog_items, swipe_captures

**Ideas & Slack**: idea_clusters, slack_ideas, slack_integration_configs

**Vector Database**: pinecone_namespaces

**Partner API**: partner_invites, partners, partner_api_keys, partner_namespace_permissions, partner_api_usage

**Profiles**: profiles (with role: user/admin)

### 1.4 AI Architecture

**Flow**: Next.js Client → Supabase Edge Function (generate) → Vercel AI Gateway → AI Provider

**Universal Generate Endpoint** supports:
- Text models (Claude, Gemini) with SSE streaming and extended thinking
- Image models (Imagen, DALL-E, FLUX) with aspect ratio handling
- Research models (Perplexity Sonar Pro) with citations

**Prompt Assembly Pipeline**:
1. Load prompt template from database (prompt_sets/prompt_versions)
2. Auto-resolve variables from session context (prompt_variables)
3. Load model-specific configuration and tips
4. Inject destination requirements (platform specs)
5. Assemble brand/voice guidelines
6. Build final prompt → Call AI → Log everything

### 1.5 Key Architectural Patterns

- **Database-driven everything**: Prompts, models, settings, namespaces — no hardcoded values
- **Variable auto-resolution**: Extract {{variable_name}} from templates, resolve from session data with JSON path support and fallbacks
- **Row Level Security**: All tables RLS-enabled, user isolation at database level
- **Version control**: Prompts (draft/active/archived), assets (incremental), drafts (iterations)
- **Complete audit logging**: Every AI call, every API request
- **60-second caching**: Namespace config cached in memory

### 1.6 Pages & Routes (35+ pages)

**Auth**: /login, /signup, /auth/callback
**Content Pipeline**: /create, /research, /outline, /draft, /outputs
**Calendar & Projects**: /calendar, /projects/new, /projects/[id], /projects/[id]/assets/[assetId]
**Search**: /search (results + chat modes)
**News**: /swipe, /captures
**Studio**: /studio/prompts, /studio/models, /studio/logs, /studio/destinations, /studio/guidelines, /studio/test
**Partner**: /partner, /partner/keys, /partner/usage, /partner/redeem
**Admin**: /admin/invites, /admin/partners, /admin/usage
**Other**: /history, /sync, /settings, /docs/api

### 1.7 Scripts & Automation

- sync-nate-full.ts — Full Substack content sync via Chrome CDP (239 posts → 1,670 vectors)
- sync-ai-models.ts — Sync models from Vercel AI Gateway
- import-posts.ts — Import newsletter posts
- reindex-all.ts — Rebuild Pinecone index
- ingest-changelogs.ts — Fetch AI/tech news from RSS feeds
- cleanup-orphans.ts — Remove orphaned records
- Daily sync automation via macOS LaunchAgent

---

## Part 2: Sibling g8n.ai Projects — Features to Extract

### 2.1 BuildWith (buildwith.g8n.ai)
**What**: Two-sided marketplace connecting AI/vibe coders (Builders) with clients
**Stack**: Next.js 16, React 19, Supabase, Clerk (Google/GitHub/LinkedIn auth), Stripe Connect Express, Tailwind + shadcn, TanStack Query, React Hook Form + Zod, Sentry, Vercel Analytics
**Key Features**: Milestone-based escrow payments, real-time messaging via Supabase Realtime, builder profiles, project management
**Extract for Business Hub**:
- Real-time messaging/notification patterns
- Payment and escrow flow concepts (for tracking payments received)
- Sentry monitoring integration
- Vercel Analytics
- React Hook Form + Zod validation patterns

### 2.2 QueryBase (querybase.g8n.ai)
**What**: Community-powered platform for writers to research and track literary agents
**Stack**: Next.js 16, React 19, Supabase, Clerk, Tailwind + shadcn
**Key Features**: Shared agent database, personal tracking dashboard, CSV import/export with field mapping, contributor leaderboard, public roadmap with voting, changelog automation with AI summaries, RSS feeds, feedback widget, admin moderation/impersonation
**Extract for Business Hub**:
- Public roadmap and changelog with voting system
- CSV import/export with intelligent field mapping
- Leaderboard / gamification patterns
- Feedback widget
- Changelog automation with AI summaries

### 2.3 UltraPost
**What**: LinkedIn automation SaaS for content creation and scheduling
**Stack**: React 19 (Vite) frontend on Vercel, Bun + ElysiaJS backend on Fly.io, SQLite, Google Gemini AI
**Key Features**: AI writer with 4 template structures (Standard, Contrarian, Story, Listicle), drag-and-drop scheduler, multi-account LinkedIn management, inbox/messages, dark mode, refinement tools (shorten, emojify, fix grammar)
**Extract for Business Hub**:
- LinkedIn post generation templates and structures
- Content refinement tools (shorten, emojify, grammar fix)
- Multi-platform scheduling patterns
- Real-time LinkedIn-style preview (mobile/desktop/full-screen)

### 2.4 AutoLead AI (intake.g8n.ai)
**What**: Autonomous AI-powered lead generation and qualification system
**Stack**: React 19 (Vite) frontend, Python FastAPI backend, SQLAlchemy, SQLite, OpenAI, Apollo
**Key Features**: 6-stage pipeline (Intake → Validation → Enrichment → Qualification → Governance → Routing), visual rules builder (no-code), AI-powered ICP scoring, real-time pipeline visualization, event-driven architecture, multi-tenant with RBAC, file upload/parsing (CSV, Excel, PDF, DOCX)
**Extract for Business Hub**:
- Pipeline visualization pattern (for tracking business workflow stages)
- Rules engine concept (for automating business decisions)
- Lead/contact management (CRM-lite for tracking conversations/calls)
- Event-driven architecture patterns
- File upload and parsing utilities

### 2.5 Editly
**What**: Collaborative writing platform with AI assistance
**Stack**: React 18 (Vite), Node.js + Express, PostgreSQL, Drizzle ORM, TipTap editor, OpenAI (GPT-4o + DALL-E 3), Passport.js
**Key Features**: TipTap rich text editor with real-time collaboration and cursor presence, content-addressable media storage (SHA-256, S3-compatible), export to PDF/EPUB/Markdown, project-based document organization
**Extract for Business Hub**:
- TipTap editor integration (richer editing than current markdown)
- Export system (PDF, EPUB, Markdown with embedded media)
- Content-addressable media storage pattern
- Real-time collaboration patterns

### 2.6 Stack Coach AI
**What**: Gamified Substack content creation companion with AI coach
**Stack**: React 19 (Vite), Bun + ElysiaJS backend on Fly.io, SQLite, Google Gemini (2.5-flash + 2.0-flash + Imagen 3.0)
**Key Features**: 4 coach personalities (Drill Sergeant, Zen Master, Growth Hacker, Empathetic Friend), live voice coaching with transcription, Content Studio with drafts and AI assistant, deep research with Google Search grounding, image generation, gamification (daily streaks, points, achievement badges), monetization planning with goal tracking
**Extract for Business Hub**:
- Gamification system (streaks, points, achievement badges) — for daily action tracking
- Voice coaching/transcription — for capturing ideas on the go
- Coach personality system — for different AI interaction modes
- Monetization planning and goal tracking
- Deep research with search grounding

### 2.7 uPoll (upoll.live)
**What**: Interactive educational engagement platform
**Stack**: React + TypeScript, Express.js, Neon PostgreSQL, Drizzle ORM, WebSockets, Zustand, Recharts
**Key Features**: Real-time polls and attendance tracking, QR code generation, WebSocket-powered interactions, 75+ components, report generation (PDF, Excel, Word, CSV), admin impersonation, batch operations
**Extract for Business Hub**:
- Report generation system (PDF, Excel, Word, CSV)
- WebSocket patterns for real-time updates
- Data visualization (Recharts)
- Admin impersonation for support

---

## Part 3: The Transformation Vision

### 3.1 Mission Statement

Transform Content Master Pro from a content creation tool into **Ahad's unified daily business operations hub** — a single app that makes it frictionless to perform, track, and log every key business activity daily, weekly, and monthly.

### 3.2 Core Pillars

#### Pillar 1: Content Generation & Repurposing (Existing + Enhanced)
- Brain dump → multi-platform content pipeline (existing)
- LinkedIn post generation with structured templates (from UltraPost)
- Content scheduling across all platforms (enhanced calendar)
- Content repurposing workflows (one piece → many formats)
- AI refinement tools (shorten, emojify, grammar fix, tone shift)

#### Pillar 2: Business KPI & OKR Tracking (New)
- Daily/Weekly/Monthly key actions dashboard
- Checklists of recurring actions (content creation, outreach, calls, etc.)
- Progress logging with timestamps
- Gamification (streaks, points, badges — from Stack Coach)
- Auto-generate insights and content from logged activities
- Trend analysis over time

#### Pillar 3: Lead Management & Sales (From AutoLead)
- Lead intake and basic qualification
- Booking tracking (conversations, calls, demos)
- Payment tracking (invoices, revenue)
- CRM-lite: contact management with notes and history
- Pipeline visualization for sales stages

#### Pillar 4: Project & Tool Management (Enhanced)
- Dashboard of all g8n.ai projects and their current status
- Cross-project content mining (search across all projects' data)
- Quick links to each deployed tool
- Integration status monitoring

#### Pillar 5: Analytics & Reporting (From uPoll + QueryBase)
- Report generation (PDF, Excel, CSV) for any time period
- Progress dashboards with visualizations
- Content performance tracking across platforms
- Revenue and growth metrics
- Export everything for further analysis

### 3.3 Daily Workflow Vision

**Morning**:
1. Open business.g8n.ai → Dashboard shows today's key actions
2. Review overnight news via Swipe → Save captures
3. Check KPI dashboard for weekly progress

**Content Block**:
4. Brain dump an idea → Run through pipeline → Schedule output
5. Repurpose existing content for other platforms
6. Review and refine scheduled posts

**Business Block**:
7. Check lead pipeline → Follow up on warm leads
8. Log calls/conversations → Track outcomes
9. Process payments → Update revenue tracking

**Evening**:
10. Log completed actions → Earn points/badges
11. Review daily progress → Auto-generate content ideas from work done
12. Plan tomorrow's key actions

### 3.4 Phased Roadmap

**Phase 0 (Current)**: Fork deployed and running at business.g8n.ai with existing features

**Phase 1**: Daily Actions Dashboard
- Key actions checklist (daily/weekly/monthly)
- Simple logging and tracking
- Streak and points system
- Basic KPI tracking

**Phase 2**: Enhanced Content Engine
- LinkedIn templates and refinement tools
- Multi-platform scheduling improvements
- Content repurposing workflows
- Rich text editing (TipTap upgrade)

**Phase 3**: CRM-Lite & Sales
- Contact/lead management
- Call/conversation logging
- Payment tracking
- Sales pipeline visualization

**Phase 4**: Analytics & Reporting
- Report generation (PDF, Excel, CSV)
- Performance dashboards
- Revenue tracking
- Trend analysis

**Phase 5**: Advanced Integrations
- Voice input/transcription
- Cross-project search
- Automated insights from activity logs
- Advanced gamification (achievements, milestones)

---

## Part 4: Original Prompt (For Reference)

> This is a codebase that I have forked from Limited Edition Jonathan, who is a peer of mine on Substack. He uses it himself for his content generation and it has a lot of AI features built in. I'm not completely aware of everything this codebase has or can do. What it's capable of etc.
>
> Eventually, this app deployed and transformed into what I want, will be what I can and will use daily to perform the actions for my business that drive it, which include generating content, building tools and projects, marketing/sales/booking conversations, having those calls/conversations, taking payments, and repurposing content and scheduling it out and tracking and leveraging all the other things I've built, and tracking my progress and daily work efforts and logging everything that gets done, so I can further and subsequently use that for more content and to perform research and glean insights, etc.

---

## Part 5: Infrastructure Notes

**Deployment Target**: business.g8n.ai (Vercel + custom domain)
**Database**: Fresh Supabase project (59 migrations to run)
**Vector DB**: Fresh Pinecone index (content-master-pro-v2, 3072 dimensions, cosine)
**AI Gateway**: Vercel AI Gateway (routes to Anthropic, Google, Perplexity, OpenAI, BFL)
**Edge Functions**: Supabase Edge Functions (generate endpoint)
