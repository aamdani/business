# Content Master Pro

A personal content creation platform that transforms unstructured ideas into polished, multi-platform content. Built for newsletter writers who want AI assistance without losing their authentic voice.

## What it does

### Content Creation Pipeline

The core workflow takes you from raw thoughts to finished drafts:

1. **Brain Dump** - Write freely about your ideas. AI extracts themes, suggests research queries, and identifies key insights.

2. **Research** - Perplexity-powered research with citations. Search your own past content for relevant references. Add notes and commentary.

3. **Outline** - AI generates a structured outline based on your research, including hook, sections, target audience, and estimated word count.

4. **Draft** - Full draft generation with real-time voice scoring to ensure the output matches your writing style. Edit in-app with markdown preview.

5. **Outputs** - Final deliverables ready for publishing.

### Semantic Search

Search across 470+ indexed newsletter posts (Jon's and Nate's) using vector similarity:
- **Results View** - Traditional search with relevance scores
- **Chat View** - Conversational AI that cites relevant posts when answering questions

### News Curation (Swipe)

A Tinder-style card interface for reviewing AI/tech news:
- Swipe right to save interesting updates with your commentary
- Swipe left to dismiss
- Fetches updates from RSS feeds and Perplexity searches
- PWA support for mobile use

### Captures

Your saved news items with commentary, searchable and ready to reference when creating content.

### Studio (Admin)

Backend configuration UI:
- **Prompts** - Database-driven prompt management with versioning (draft → active → archived)
- **Models** - AI model configuration synced from Vercel AI Gateway
- **Logs** - Full audit trail of all AI calls
- **Destinations** - Output platform configuration
- **Guidelines** - Voice and style guidelines

### Partner API

REST API for third-party access:
- API key management with usage limits
- Invite system for onboarding partners
- Usage tracking and analytics
- Namespace-based access control

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Runtime | React 19 |
| UI | shadcn/ui + Tailwind CSS v4 |
| Auth & DB | Supabase (PostgreSQL + Auth) |
| Vector Search | Pinecone |
| AI | Vercel AI Gateway (Claude, Gemini, Perplexity) |
| Data Fetching | TanStack Query |
| Animation | Framer Motion |
| Testing | Vitest + Playwright |
| PWA | next-pwa |

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project
- Pinecone index
- Vercel AI Gateway API key

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_HOST=your_pinecone_host
VERCEL_AI_GATEWAY_API_KEY=your_gateway_key
```

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other Commands

```bash
npm run lint      # ESLint
npm run format    # Prettier
npm run test      # Vitest
npm run build     # Production build
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup
│   ├── (dashboard)/      # Protected routes
│   │   ├── create/       # Brain dump entry point
│   │   ├── research/     # Perplexity research
│   │   ├── outline/      # Outline generation
│   │   ├── draft/        # Draft writing + voice scoring
│   │   ├── outputs/      # Final content
│   │   ├── search/       # Semantic search + chat
│   │   ├── swipe/        # News curation cards
│   │   ├── captures/     # Saved news items
│   │   ├── studio/       # Admin (prompts, models, logs)
│   │   ├── partner/      # Partner dashboard
│   │   └── admin/        # Admin (invites, partners, usage)
│   ├── api/              # API routes
│   └── docs/             # API documentation
├── components/
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
└── lib/
    ├── supabase/         # Supabase clients
    ├── pinecone/         # Pinecone client
    └── utils.ts          # Utilities
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Engineering rules and database schema
- [CHANGELOG.md](./CHANGELOG.md) - All changes
- [docs/](./docs/) - Architecture decisions and phase summaries

## License

Private - not for redistribution.
