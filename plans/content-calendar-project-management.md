# Content Calendar & Project Management System

## Ralph Wiggum Implementation

This plan is configured for **Ralph Wiggum loop execution**. See [`.ralph/ORCHESTRATION.md`](../.ralph/ORCHESTRATION.md) for instructions.

### Quick Start

```bash
# Run Phase 1 (Database)
/ralph-loop ".ralph/prompts/phase-1-database.md" --completion-promise "PHASE 1 COMPLETE" --max-iterations 15
```

### Phase Prompts

| Phase | Prompt File | Promise |
|-------|-------------|---------|
| 1 | [phase-1-database.md](../.ralph/prompts/phase-1-database.md) | `PHASE 1 COMPLETE` |
| 2 | [phase-2-types-hooks.md](../.ralph/prompts/phase-2-types-hooks.md) | `PHASE 2 COMPLETE` |
| 3 | [phase-3-calendar-ui.md](../.ralph/prompts/phase-3-calendar-ui.md) | `PHASE 3 COMPLETE` |
| 4 | [phase-4-project-detail.md](../.ralph/prompts/phase-4-project-detail.md) | `PHASE 4 COMPLETE` |
| 5 | [phase-5-asset-editor.md](../.ralph/prompts/phase-5-asset-editor.md) | `PHASE 5 COMPLETE` |
| 6 | [phase-6-navigation.md](../.ralph/prompts/phase-6-navigation.md) | `PHASE 6 COMPLETE` |
| 7 | [phase-7-migration.md](../.ralph/prompts/phase-7-migration.md) | `CALENDAR SYSTEM COMPLETE` |

---

## Problem Statement

Content creation is currently scattered across Google Docs, Notion, and Slack with no single source of truth. This plan implements:

1. **Content Calendar** - Visual calendar view showing scheduled/published content (becomes the new homepage)
2. **Project Management** - Database-driven projects with assets, versioning, and edit locking
3. **Publication Tracking** - Track where/when content is published across platforms
4. **Migration** - Import existing content from markdown files

The system uses `nate_` prefixed tables and integrates with existing features (destinations, AI generation, guidelines).

---

## Implementation Plan

### Phase 1: Database Schema

Create four new tables with proper RLS policies:
- `nate_content_projects` - Publication efforts with scheduling
- `nate_project_assets` - Individual content pieces with edit locking
- `nate_asset_versions` - Version history for assets
- `nate_project_publications` - Publication records per platform

### Phase 2: Types and Hooks

Add TypeScript types to `lib/types.ts` and create hooks following existing patterns:
- `useProjects`, `useProject`, `useCreateProject`, `useUpdateProject`, `useDeleteProject`
- `useAssets`, `useAsset`, `useCreateAsset`, `useUpdateAsset`
- `useAssetVersions`, `useCreateVersion`, `useRestoreVersion`
- `usePublications`, `useCreatePublication`
- Edit lock hooks: `useAcquireLock`, `useReleaseLock`, `useCheckLock`

### Phase 3: Calendar UI (New Homepage)

Build the calendar page at `/calendar`:
- Month/week view toggle
- Project cards on scheduled dates
- Status filtering (draft, review, scheduled, published)
- Platform filtering
- Quick create button

### Phase 4: Project Detail Page

Build project detail at `/projects/[id]`:
- Project header with status and actions
- Asset grid/list view
- Publication tracking panel
- Notes section
- Status workflow buttons

### Phase 5: Asset Editor

Build asset editor at `/projects/[id]/assets/[assetId]`:
- Rich text editing (or textarea for MVP)
- Edit lock status banner
- Version history sidebar
- Save/restore functionality
- Lock acquisition on edit, release on exit

### Phase 6: Navigation Changes

- Add Calendar to sidebar (primary position)
- Update homepage redirect (`/ → /calendar`)
- Add Projects section to sidebar

### Phase 7: Migration Script

Create script to import existing content from migration folder:
- Parse markdown files
- Extract dates, titles, links, notes
- Create projects and asset stubs
- Preserve Google Doc URLs as external_url

---

## Files to Modify

- `src/lib/types.ts` - Add project/asset/publication types
- `src/components/dashboard/sidebar.tsx` - Add Calendar and Projects links
- `src/app/page.tsx` - Redirect to /calendar
- `src/app/(dashboard)/layout.tsx` - No changes needed (reuse existing layout)

## New Files

### Database Migrations
- `supabase/migrations/20260129000001_nate_content_projects.sql`
- `supabase/migrations/20260129000002_nate_project_assets.sql`
- `supabase/migrations/20260129000003_nate_asset_versions.sql`
- `supabase/migrations/20260129000004_nate_project_publications.sql`

### Hooks
- `src/hooks/use-projects.ts`
- `src/hooks/use-assets.ts`
- `src/hooks/use-asset-versions.ts`
- `src/hooks/use-publications.ts`

### Pages
- `src/app/(dashboard)/calendar/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/projects/[id]/assets/[assetId]/page.tsx`

### Components
- `src/components/calendar/calendar-view.tsx`
- `src/components/calendar/calendar-grid.tsx`
- `src/components/calendar/project-card.tsx`
- `src/components/projects/asset-card.tsx`
- `src/components/projects/asset-editor.tsx`
- `src/components/projects/publication-modal.tsx`
- `src/components/projects/version-history.tsx`
- `src/components/projects/lock-banner.tsx`

### Scripts
- `scripts/migrate-content.ts`

---

## Execution Order

### Setup
- [x] 0. Copy this plan to `./plans/content-calendar-project-management.md`

### Phase 1: Database (Migrations)
- [ ] 1. Create `nate_content_projects` migration with RLS
- [ ] 2. Create `nate_project_assets` migration with edit locking fields and RLS
- [ ] 3. Create `nate_asset_versions` migration with RLS
- [ ] 4. Create `nate_project_publications` migration linking to destinations
- [ ] 5. Run migrations locally to verify

### Phase 2: Types and Hooks
- [ ] 6. Add types to `src/lib/types.ts`
- [ ] 7. Create `src/hooks/use-projects.ts`
- [ ] 8. Create `src/hooks/use-assets.ts`
- [ ] 9. Create `src/hooks/use-asset-versions.ts`
- [ ] 10. Create `src/hooks/use-publications.ts`

### Phase 3: Calendar UI
- [ ] 11. Create `src/components/calendar/calendar-view.tsx`
- [ ] 12. Create `src/components/calendar/calendar-grid.tsx`
- [ ] 13. Create `src/components/calendar/project-card.tsx`
- [ ] 14. Create `src/app/(dashboard)/calendar/page.tsx`
- [ ] 15. Test calendar page renders

### Phase 4: Project Detail
- [ ] 16. Create `src/components/projects/asset-card.tsx`
- [ ] 17. Create `src/components/projects/publication-modal.tsx`
- [ ] 18. Create `src/app/(dashboard)/projects/[id]/page.tsx`
- [ ] 19. Test project detail page

### Phase 5: Asset Editor
- [ ] 20. Create `src/components/projects/lock-banner.tsx`
- [ ] 21. Create `src/components/projects/version-history.tsx`
- [ ] 22. Create `src/components/projects/asset-editor.tsx`
- [ ] 23. Create `src/app/(dashboard)/projects/[id]/assets/[assetId]/page.tsx`
- [ ] 24. Test edit locking behavior
- [ ] 25. Test version creation on save

### Phase 6: Navigation
- [ ] 26. Update `src/components/dashboard/sidebar.tsx` with Calendar link
- [ ] 27. Update `src/app/page.tsx` to redirect to /calendar
- [ ] 28. Test navigation flow

### Phase 7: Migration
- [ ] 29. Create `scripts/migrate-content.ts`
- [ ] 30. Run migration against existing content
- [ ] 31. Verify migrated data in UI

### Finalization
- [ ] 32. Run linter and fix any issues
- [ ] 33. Test full flow: create project → add assets → edit with versioning → publish
- [ ] 34. Mark plan complete

---

## Database Schema Details

### nate_content_projects

```sql
CREATE TABLE nate_content_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT UNIQUE NOT NULL,        -- yyyymmdd_xxx format
  title TEXT NOT NULL,
  scheduled_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'review', 'scheduled', 'published')),
  target_platforms JSONB DEFAULT '[]',    -- ['youtube', 'substack', 'tiktok']
  notes TEXT,
  video_runtime TEXT,                     -- e.g., "21:53"
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### nate_project_assets

```sql
CREATE TABLE nate_project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES nate_content_projects(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,               -- post, transcript_youtube, description_youtube, prompts, guide, etc.
  title TEXT,
  content TEXT,
  current_version INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'final')),
  external_url TEXT,                      -- Legacy Google Doc link
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### nate_asset_versions

```sql
CREATE TABLE nate_asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES nate_project_assets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, version_number)
);
```

### nate_project_publications

```sql
CREATE TABLE nate_project_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES nate_content_projects(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES destinations(id),  -- Link to existing destinations table
  platform TEXT NOT NULL,                 -- youtube, tiktok, substack, linkedin
  published_at TIMESTAMPTZ NOT NULL,
  published_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Asset Types Reference

| Asset Type | Description |
|------------|-------------|
| `post` | Main article/script content |
| `transcript_youtube` | YouTube video transcript |
| `transcript_tiktok` | TikTok video transcript |
| `description_youtube` | YouTube video description |
| `description_tiktok` | TikTok video description |
| `prompts` | Prompt kit (companion artifact) |
| `guide` | Companion guide/resource |
| `post_linkedin` | LinkedIn post |
| `post_substack` | Substack-specific content |
| `image_substack` | Header image for Substack |

---

## Notes

### Edit Locking Strategy
- **Acquire lock:** When user clicks "Edit" on an asset
- **Release lock:** When user saves and closes, navigates away, or closes browser (via beforeunload)
- **Inactivity timeout:** 
  - Reset 30-minute timer on every content change (textarea `onChange`)
  - When timer expires, show modal: "Are you still there?"
  - If no response or user confirms done → auto-save version, release lock, redirect to project
  - If user confirms still working → reset timer, continue editing
- **Lock check:** Before opening editor, check if `locked_by` is set and `locked_at` is recent

### Version Creation
- Every "Save" creates a new version in `nate_asset_versions`
- `current_version` on the asset increments
- Restore = create new version with old content (not overwrite)

### Calendar View
- Default: current week + next 2 weeks visible
- Month view shows smaller cards
- Color coding by status (gray=draft, yellow=review, blue=scheduled, green=published)

### Integration with Existing Systems
- Publication tracking uses `destinations` table (already exists)
- Could optionally link assets to `content_sessions` if AI-generated
- Could index published content in Pinecone (future enhancement)

### Migration Data Source
- Location: `/Users/jonathanedwards/AUTOMATION/Clients/nate work/Migration to new database/`
- Contains: 10 dated posts, 3 additional pieces, 2 prompt kits, calendar overview

---

## Dependencies

- TanStack Query (already installed)
- shadcn/ui components (already installed)
- Supabase client (already configured)
- Lucide icons (already installed)

No new npm packages required.
