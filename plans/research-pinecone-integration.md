## Status: Complete

# Research Persistence & Pinecone Integration Plan

## Problem Statement
Research results from Perplexity are not being saved to the database and are lost on refresh. Additionally, there's no way to reuse past research, leading to redundant API calls and lost knowledge.

## Goals
1. Save all research to `content_research` table
2. Index research in Pinecone (`research` namespace) for semantic search
3. Auto-suggest relevant past research before calling Perplexity
4. Allow users to skip research phase entirely (for opinion pieces)

---

## Implementation Plan

### Phase 1: Database + Core Save Logic

**1.1 Add Pinecone tracking columns**
- Create migration: `supabase/migrations/YYYYMMDD_add_pinecone_indexed_to_research.sql`
```sql
ALTER TABLE content_research
  ADD COLUMN pinecone_indexed BOOLEAN DEFAULT FALSE,
  ADD COLUMN pinecone_indexed_at TIMESTAMPTZ,
  ADD COLUMN pinecone_error TEXT;
```

**1.2 Create embedding utility**
- File: `src/lib/pinecone/embed-research.ts`
- Function: `embedResearch(researchId, query, response, sessionId)`
- Uses `multilingual-e5-large` model (same as posts)
- Truncates to 8000 chars (no chunking needed)
- Metadata: `{ id, session_id, query, content_preview, created_at, word_count }`

**1.3 Add namespace constant**
- File: `src/lib/pinecone/client.ts`
- Add: `RESEARCH: "research"` to namespace constants

**1.4 Create save API route**
- File: `src/app/api/research/save/route.ts`
- POST: `{ session_id, query, response, citations }`
- Saves to DB (sync), embeds to Pinecone (async/non-blocking)
- Returns research ID immediately

### Phase 2: Search Past Research

**2.1 Create search utility**
- File: `src/lib/pinecone/search-research.ts`
- Function: `searchResearch(query, topK = 5)`
- Searches `research` namespace
- Returns matches with scores and metadata

**2.2 Create search API route**
- File: `src/app/api/research/search/route.ts`
- POST: `{ query }`
- Returns relevant past research with content previews

### Phase 3: Update Research Page UX

**3.1 Add "Skip Research" option**
- On `/create` page results, add checkbox: "Skip research (opinion piece)"
- When checked, "Continue to Research" becomes "Continue to Outline"
- Bypasses `/research` page entirely

**3.2 Auto-suggest past research**
- When user lands on `/research` with themes from brain dump:
  - Immediately search Pinecone for related past research
  - Display matches in a collapsible "Related Past Research" section
  - User can: (a) Use existing research, (b) Do new Perplexity search, (c) Do both

**3.3 Save after generation**
- After successful Perplexity call, auto-save via `/api/research/save`
- Show toast confirmation
- Don't block UI on Pinecone indexing

### Phase 4: Resilience (Optional/Later)

**4.1 Re-indexing endpoint**
- File: `src/app/api/admin/reindex-research/route.ts`
- Retries failed Pinecone embeddings

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDD_add_pinecone_indexed_to_research.sql` | Add tracking columns |
| `src/lib/pinecone/embed-research.ts` | Embedding utility |
| `src/lib/pinecone/search-research.ts` | Search utility |
| `src/app/api/research/save/route.ts` | Save + embed endpoint |
| `src/app/api/research/search/route.ts` | Search endpoint |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/pinecone/client.ts` | Add `RESEARCH` namespace constant |
| `src/app/(dashboard)/research/page.tsx` | Add auto-save, past research display, skip option |
| `src/app/(dashboard)/create/page.tsx` | Add "Skip Research" checkbox |

---

## Execution Order

- [x] 0. Copy this plan to `./plans/research-pinecone-integration.md`
- [x] 1. Create migration for pinecone tracking columns
- [x] 2. Run migration: `supabase db push`
- [x] 3. Add namespace constant to `client.ts`
- [x] 4. Create `embed-research.ts` utility
- [x] 5. Create `search-research.ts` utility
- [x] 6. Create `/api/research/save` route
- [x] 7. Create `/api/research/search` route
- [x] 8. Update research page: auto-save after generation
- [x] 9. Update research page: show past research suggestions
- [x] 10. Update create page: add skip research option
- [x] 11. Test end-to-end flow (build passes)
- [x] 12. Mark plan complete

---

## Architecture Flow

```
/create page
    ↓
[Extract Themes] → Brain dump parsed
    ↓
[ ] Skip Research? ─── Yes ──→ /outline (bypass research)
    │
    No
    ↓
/research page
    ↓
[Auto-search Pinecone for related past research]
    ↓
┌─────────────────────────────────────┐
│  Related Past Research (if any)     │
│  • Research on X (85% match) [Use]  │
│  • Research on Y (72% match) [Use]  │
└─────────────────────────────────────┘
    ↓
[Start New Research] ← User can still do fresh Perplexity call
    ↓
Results displayed + auto-saved to DB + async embed to Pinecone
    ↓
/outline
```

---

## Notes

- **No chunking**: Research responses (2-5k chars) fit in embedding model limits
- **Async embedding**: Don't block UI; track failures for retry
- **Namespace**: `research` (simple, clear)
- **Model**: `multilingual-e5-large` (same as posts for consistency)
