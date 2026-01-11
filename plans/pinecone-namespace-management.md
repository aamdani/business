## Status: ✅ Complete

# Pinecone Namespace Management

## Problem Statement
Transform hardcoded Pinecone namespaces into database-driven configuration with UI management. This enables:
- 4 initial namespaces: `jon`, `nate`, `official-docs`, `research`
- Future namespace additions via UI
- Shared RAG database across multiple apps (aicred, future apps)

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Namespace names | `jon`, `nate`, `official-docs`, `research` | Clean names, fresh index with no legacy data |
| Table design | Dedicated `pinecone_namespaces` table | Better than app_settings for entity management |
| UI placement | Settings page card | Consistent with existing patterns |
| Migration | None needed | Index `content-master-pro-v2` is empty |

---

## Database Schema

```sql
CREATE TABLE pinecone_namespaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'jon', 'nate', 'official-docs', 'research'
  display_name TEXT NOT NULL,          -- 'Jon', 'Nate', 'Official Docs', 'Research'
  description TEXT,                    -- Optional description
  source_type TEXT,                    -- 'newsletter', 'documentation', 'research'
  is_active BOOLEAN DEFAULT true,      -- Enable/disable namespace
  is_searchable BOOLEAN DEFAULT true,  -- Include in search results
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial seed data:**
| slug | display_name | source_type |
|------|--------------|-------------|
| `jon` | Jon | newsletter |
| `nate` | Nate | newsletter |
| `official-docs` | Official Docs | documentation |
| `research` | Research | research |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/pinecone/client.ts` | Remove `PINECONE_NAMESPACES`, add `getPineconeNamespace()` |
| `src/lib/pinecone/search.ts` | Remove `SEARCH_NAMESPACES`, load from database |
| `src/lib/constants.ts` | Remove `PINECONE_NAMESPACES` |
| `src/app/api/sync/route.ts` | Use database namespace lookup |
| `src/app/api/cron/sync/route.ts` | Use database namespace lookup |
| `scripts/import-posts.ts` | Load namespaces from database |
| `scripts/reindex-all.ts` | Load namespaces from database |
| `src/app/(dashboard)/settings/page.tsx` | Add NamespaceManager component |

## New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260110000001_pinecone_namespaces.sql` | Table, RLS, seed data |
| `src/lib/pinecone/namespaces.ts` | Namespace loader with caching |
| `src/lib/types/pinecone.ts` | TypeScript interfaces |
| `src/components/namespace-manager.tsx` | CRUD UI component |

---

## Execution Order

### Phase 1: Database & Core
- [x] Copy this plan to `./plans/pinecone-namespace-management.md`
- [x] Create migration: `20260110000001_pinecone_namespaces.sql`
- [x] Create types: `src/lib/types.ts` (added to existing types file)
- [x] Create namespace loader: `src/lib/pinecone/namespaces.ts`
- [x] Update client: `src/lib/pinecone/client.ts`

### Phase 2: Integration
- [x] Update search: `src/lib/pinecone/search.ts`
- [x] Update sync route: `src/app/api/sync/route.ts`
- [x] Update cron sync: `src/app/api/cron/sync/route.ts`
- [x] Update import script: `scripts/import-posts.ts`
- [x] Update reindex script: `scripts/reindex-all.ts`
- [x] Remove constants: `src/lib/constants.ts`
- [x] Fix research embedding files: `src/lib/pinecone/embed-research.ts`, `search-research.ts`
- [x] Fix search API routes: `src/app/api/search/route.ts`, `chat/route.ts`

### Phase 3: UI
- [x] Create component: `src/components/namespace-manager.tsx`
- [x] Add to settings: `src/app/(dashboard)/settings/page.tsx`

### Phase 4: Cleanup
- [x] TypeScript compilation passes
- [ ] Run migration in Supabase (manual step)
- [ ] Re-import posts to new namespaces (manual step)
- [x] Update documentation

---

## Notes

- **Fresh start:** Index `content-master-pro-v2` is empty, no migration needed
- **Re-import required:** After implementation, run import scripts to populate namespaces
- **Caching:** Namespace loader will cache for 60s (namespaces rarely change)
- **RLS:** Authenticated users can read, admins can write
- **Shared database:** This index serves multiple apps (Content Master Pro, Aicred, future apps)

## Post-Implementation Steps

1. Run the migration in Supabase Dashboard or via CLI
2. Re-import posts using the new namespace structure:
   ```bash
   npx tsx scripts/import-posts.ts --source all
   # or
   npx tsx scripts/reindex-all.ts --source all
   ```
3. Verify in the Settings page that namespaces appear in the UI
