# Fix Content Pipeline Persistence & Image Storage

## Problem Statement

Two critical architectural gaps make core features non-functional:

1. **Sessions not persisted** → History page is empty
   - No `content_session` record is ever created
   - All pipeline data stored in React state + sessionStorage (browser-only)
   - Edge Functions have database code but `session_id` is never passed

2. **Images not stored** → Generated images are ephemeral
   - No Supabase storage bucket exists
   - Images returned as base64, stored only in React state
   - `generate-image` tries to save to non-existent `generated_images` table
   - Images disappear when user navigates away

---

## Implementation Plan

### Phase 1: Database Schema Updates

**1.1 Create `generated_images` table**

> **Review Note:** Made `session_id` NULLABLE since `/outputs` page can generate images
> without a session context. Added `user_id NOT NULL` since Edge Function has user.
> Kept `storage_path` nullable for fallback when storage upload fails.

```sql
-- supabase/migrations/20241229000002_generated_images.sql
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES content_sessions(id) ON DELETE SET NULL,  -- NULLABLE
  storage_path TEXT,  -- Nullable for fallback
  public_url TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  model_used TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT '16:9',
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'image/png',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own images" ON generated_images
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own images" ON generated_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own images" ON generated_images
  FOR DELETE USING (auth.uid() = user_id);

-- Index for session lookups
CREATE INDEX idx_generated_images_session ON generated_images(session_id);
CREATE INDEX idx_generated_images_user ON generated_images(user_id);
```

**1.2 Create Supabase Storage Bucket (PUBLIC)**
```sql
-- Create PUBLIC bucket for generated images (simpler, no signed URLs needed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true);

-- RLS for storage - anyone can view, only owners can upload/delete
CREATE POLICY "Anyone can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'generated-images');

CREATE POLICY "Users can upload own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'generated-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'generated-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

### Phase 2: Session Creation Flow

**2.1 Create session when brain dump is submitted**

Modify `/create` page to:
1. Create `content_session` record FIRST (status: 'brain_dump')
2. Pass `session_id` to `parse-brain-dump` Edge Function
3. Store `session_id` in URL/state for subsequent pages

```typescript
// src/app/(dashboard)/create/page.tsx
// On "Extract Themes" click:
const { data: session } = await supabase
  .from('content_sessions')
  .insert({ status: 'brain_dump', title: 'New Session' })
  .select()
  .single();

const response = await fetch('.../parse-brain-dump', {
  body: JSON.stringify({
    content,
    session_id: session.id  // ADD THIS
  })
});

// Navigate with session_id
router.push(`/research?session_id=${session.id}&theme=${encodeURIComponent(theme)}`);
```

**2.2 Pass session_id through all pipeline pages**

Each page reads `session_id` from URL and passes to Edge Functions:
- `/research?session_id=xxx` → `generate-research`
- `/outline?session_id=xxx` → `generate-outlines`
- `/draft?session_id=xxx` → `generate-draft`
- `/outputs?session_id=xxx` → all output generators

**2.3 Update session status as user progresses**
```typescript
// After each successful step, update status
await supabase
  .from('content_sessions')
  .update({ status: 'research' }) // or 'outline', 'draft', 'outputs'
  .eq('id', sessionId);
```

---

### Phase 3: Image Storage Integration

**3.1 Update `generate-image` Edge Function**

> **Review Note:** Current code already tries to save to `generated_images` but:
> - Missing `user_id` in insert
> - No storage upload (just base64)
> - Handle nullable `session_id`

```typescript
// supabase/functions/generate-image/index.ts

// After generating image:
const imageBuffer = Buffer.from(base64Image, 'base64');
// Use 'standalone' folder when no session
const folder = session_id || 'standalone';
const fileName = `${user.id}/${folder}/${crypto.randomUUID()}.png`;

// Upload to storage
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('generated-images')
  .upload(fileName, imageBuffer, {
    contentType: 'image/png',
    upsert: false
  });

// Get public URL (no expiration since bucket is public)
const { data: urlData } = supabase.storage
  .from('generated-images')
  .getPublicUrl(fileName);

// Save to database
await supabase.from('generated_images').insert({
  user_id,
  session_id,
  storage_path: fileName,
  public_url: urlData.publicUrl,
  prompt,
  negative_prompt,
  model_used,
  aspect_ratio,
  file_size: imageBuffer.length
});

// Return public URL (never expires)
return { image_url: urlData.publicUrl, ... };
```

**3.2 Update Outputs page to use URLs**

- Fetch images from `generated_images` table for current session
- Display using `<img src={image.public_url}>` (URLs never expire)
- Remove base64 handling from state

---

### Phase 4: History Page Updates

**4.1 Update History queries to include images**

```typescript
// src/app/(dashboard)/history/page.tsx
const { data: sessions } = await supabase
  .from('content_sessions')
  .select(`
    *,
    content_brain_dumps(*),
    content_research(*),
    content_outlines(*),
    content_drafts(*),
    content_outputs(*),
    generated_images(*)  // ADD THIS
  `)
  .order('updated_at', { ascending: false });
```

**4.2 Display images in session detail view**

- Show thumbnail grid of generated images
- Click to view full size
- Option to regenerate/download

---

### Phase 5: Migration & Cleanup

**5.1 Remove sessionStorage usage**

> **Review Note:** Found these specific locations during code review:

| File | Key | Line |
|------|-----|------|
| `research/page.tsx` | `selectedResearch` | 143 |
| `outputs/page.tsx` | `draftForOutputs` | 118 |
| `outline/page.tsx` | TBD | verify |
| `draft/page.tsx` | TBD | verify |

- Delete all `sessionStorage.setItem/getItem` calls
- Replace with database queries using `session_id`

**5.2 Add session context/hook**
```typescript
// src/hooks/useSession.ts
export function useSession(sessionId: string) {
  // Load session data from database
  // Provide methods to update session
  // Handle loading/error states
}
```

---

## Files to Modify

### Database
- `supabase/migrations/20241229000002_generated_images.sql` (NEW)

### Edge Functions
- `supabase/functions/generate-image/index.ts` - Add storage upload
- `supabase/functions/parse-brain-dump/index.ts` - Already has session_id support
- `supabase/functions/generate-research/index.ts` - Verify session_id handling
- `supabase/functions/generate-outlines/index.ts` - Verify session_id handling
- `supabase/functions/generate-draft/index.ts` - Verify session_id handling

### Frontend Pages
- `src/app/(dashboard)/create/page.tsx` - Create session, pass session_id
- `src/app/(dashboard)/research/page.tsx` - Read/pass session_id
- `src/app/(dashboard)/outline/page.tsx` - Read/pass session_id
- `src/app/(dashboard)/draft/page.tsx` - Read/pass session_id
- `src/app/(dashboard)/outputs/page.tsx` - Read session_id, use image URLs
- `src/app/(dashboard)/history/page.tsx` - Include images in query

### New Files
- `src/hooks/useSession.ts` - Session data hook
- `src/lib/supabase/storage.ts` - Storage utilities

---

## Execution Order

0. [x] Copy this plan to `./plans/fix-session-persistence-and-image-storage.md`
1. [ ] Create migration for `generated_images` table + storage bucket
2. [ ] Run migration: `supabase db push`
3. [ ] Update `generate-image` Edge Function for storage
4. [ ] Update `/create` page to create session first
5. [ ] Update `/research` page to use session_id
6. [ ] Update `/outline` page to use session_id
7. [ ] Update `/draft` page to use session_id
8. [ ] Update `/outputs` page to use session_id + image URLs
9. [ ] Update History page to show images
10. [ ] Remove sessionStorage usage
11. [ ] Test full pipeline end-to-end
12. [ ] Verify History shows sessions with images

---

## Notes

- Storage path format: `{user_id}/{session_id}/{image_id}.png`
- Public bucket = URLs never expire (simpler implementation)
- Consider adding image thumbnails for faster History loading
- Edge Functions need service role key for storage operations
