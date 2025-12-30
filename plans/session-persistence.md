# Session Persistence Plan

## Status: Complete

## Problem Statement
When navigating away from pages or resuming sessions from history, all extracted content is lost. The database tables exist (`content_brain_dumps`, `content_outlines`, `content_drafts`) but the application never writes to them - only `content_research` is being saved.

**User Impact:**
- Back button loses all progress
- Resuming from history shows empty pages
- Extracted themes, outlines, and drafts must be regenerated
- Wasted AI credits regenerating lost content

## Goals
1. Save brain dumps (raw content + extracted themes) to `content_brain_dumps`
2. Save generated outlines to `content_outlines`
3. Save generated drafts and voice scores to `content_drafts`
4. Enable full session continuity - resume from any point with full context

---

## Current State Analysis

### Database Tables (ALL EXIST with proper schema + RLS)

| Table | Columns | Currently Used? |
|-------|---------|-----------------|
| `content_sessions` | id, user_id, status, title, created_at, updated_at | Yes |
| `content_brain_dumps` | id, session_id, raw_content, extracted_themes, created_at | Never written |
| `content_research` | id, session_id, query, response, sources, created_at | Yes |
| `content_outlines` | id, session_id, outline_json, selected, user_feedback, created_at | Never written |
| `content_drafts` | id, session_id, content, voice_score, version, created_at | Never written |

### Page-by-Page Analysis

**Create Page** (`src/app/(dashboard)/create/page.tsx`):
- Lines 168-185: Creates session row
- Lines 197-208: Generates AI extraction
- Line 207: Stores in React state `setResult(parsed)` only
- Lines 62-106: Tries to load from `content_brain_dumps` on resume (finds nothing)
- **MISSING**: Save to `content_brain_dumps` after extraction

**Outline Page** (`src/app/(dashboard)/outline/page.tsx`):
- Lines 122-170: Loads research from database
- Lines 172-202: Generates outline via AI
- Line 188: Stores in React state `setResult(parsed)` only
- **MISSING**: Save to `content_outlines` after generation
- **MISSING**: Load existing outline on resume

**Draft Page** (`src/app/(dashboard)/draft/page.tsx`):
- Lines 84-155: Loads outline and existing draft
- Lines 157-192: Generates draft via AI
- Line 181: Stores in React state `setDraft(result.content)` only
- **MISSING**: Save to `content_drafts` after generation
- **MISSING**: Save voice_score after voice check

---

## Implementation Plan

### Phase 1: Create Page - Save Brain Dump

**File:** `src/app/(dashboard)/create/page.tsx`

**Change:** After line 207 (inside `if (parsed)` block in `handleParse`)

```typescript
if (parsed) {
  setResult(parsed);

  // NEW: Save brain dump to database
  const { error: brainDumpError } = await supabase
    .from("content_brain_dumps")
    .upsert({
      session_id: activeSessionId,
      raw_content: content.trim(),
      extracted_themes: parsed,
    }, {
      onConflict: 'session_id'
    });

  if (brainDumpError) {
    console.error("Failed to save brain dump:", brainDumpError);
  }
}
```

### Phase 2: Outline Page - Save Outline

**File:** `src/app/(dashboard)/outline/page.tsx`

**Change 1:** After line 188 (inside `if (parsed)` block in `handleGenerateOutline`)

```typescript
if (parsed) {
  setResult(parsed);
  setExpandedSections(new Set([0]));

  // NEW: Save outline to database
  if (sessionId) {
    const { error: outlineError } = await supabase
      .from("content_outlines")
      .upsert({
        session_id: sessionId,
        outline_json: parsed.outline,
        user_feedback: userInput.trim() || null,
        selected: true,
      }, {
        onConflict: 'session_id'
      });

    if (outlineError) {
      console.error("Failed to save outline:", outlineError);
    }
  }

  // Existing: Update session status...
}
```

**Change 2:** In `loadResearch` useEffect - also load existing outline

```typescript
// After loading research, check for existing outline
const { data: existingOutline } = await supabase
  .from("content_outlines")
  .select("outline_json, user_feedback")
  .eq("session_id", sessionId)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

if (existingOutline?.outline_json) {
  setResult({
    outline: existingOutline.outline_json,
    summary: "",
    alternative_angles: [],
  });
  if (existingOutline.user_feedback) {
    setUserInput(existingOutline.user_feedback);
  }
}
```

### Phase 3: Draft Page - Save Draft

**File:** `src/app/(dashboard)/draft/page.tsx`

**Change 1:** After line 181 (inside success block in `handleGenerateDraft`)

```typescript
if (result?.success && result.content) {
  setDraft(result.content);

  // NEW: Save draft to database
  if (sessionId) {
    const { error: draftError } = await supabase
      .from("content_drafts")
      .upsert({
        session_id: sessionId,
        content: result.content,
        voice_score: null,
        version: 1,
      }, {
        onConflict: 'session_id'
      });

    if (draftError) {
      console.error("Failed to save draft:", draftError);
    }
  }

  // Existing: Update session status...
}
```

**Change 2:** After line 214 (inside `if (result)` block in `handleCheckVoice`)

```typescript
if (result) {
  setVoiceScore(result);

  // NEW: Update draft with voice score
  if (sessionId) {
    await supabase
      .from("content_drafts")
      .update({ voice_score: result })
      .eq("session_id", sessionId);
  }
}
```

### Phase 4: Auto-save Draft Edits (Optional Enhancement)

**File:** `src/app/(dashboard)/draft/page.tsx`

Add debounced auto-save when user edits draft:

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSaveDraft = useDebouncedCallback(
  async (content: string) => {
    if (!sessionId || !content.trim()) return;
    const supabase = createClient();
    await supabase
      .from("content_drafts")
      .update({ content })
      .eq("session_id", sessionId);
  },
  2000
);

// In textarea onChange:
onChange={(e) => {
  setDraft(e.target.value);
  debouncedSaveDraft(e.target.value);
}}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/(dashboard)/create/page.tsx` | Add brain dump save after extraction |
| `src/app/(dashboard)/outline/page.tsx` | Add outline save + load existing on resume |
| `src/app/(dashboard)/draft/page.tsx` | Add draft save, voice score save, auto-save edits |

## Dependencies
- Check if `use-debounce` is installed (for optional auto-save feature)
- If not: `npm install use-debounce`

---

## Execution Order

- [ ] 1. Verify/install `use-debounce` dependency
- [ ] 2. Update create page: save brain dump after extraction
- [ ] 3. Update outline page: save outline after generation
- [ ] 4. Update outline page: load existing outline on resume
- [ ] 5. Update draft page: save draft after generation
- [ ] 6. Update draft page: save voice score after check
- [ ] 7. Update draft page: add debounced auto-save for edits
- [ ] 8. Test full flow: create → research → outline → draft
- [ ] 9. Test resume from history at each stage
- [ ] 10. Test back button navigation
- [ ] 11. Mark plan complete

---

## Architecture Flow (After Implementation)

```
/create page
    │
    ├─ Extract Themes (AI)
    ├─ Save to content_brain_dumps ← NEW
    ↓
/research page
    │
    ├─ Generate Research (Perplexity)
    ├─ Save to content_research ← Already working
    ↓
/outline page
    │
    ├─ Load research from DB
    ├─ Load existing outline if resuming ← NEW
    ├─ Generate Outline (AI)
    ├─ Save to content_outlines ← NEW
    ↓
/draft page
    │
    ├─ Load outline from DB
    ├─ Load existing draft if resuming ← Already works (but data was empty)
    ├─ Generate Draft (AI)
    ├─ Save to content_drafts ← NEW
    ├─ Auto-save edits (debounced) ← NEW
    ├─ Voice Check (AI)
    ├─ Save voice_score ← NEW
    ↓
/outputs page
```

**Resume Flow:**
```
History → Click session → Route to correct page based on status
    │
    ├─ status="brain_dump" → /create → Load from content_brain_dumps
    ├─ status="research" → /research → Load from content_research
    ├─ status="outline" → /outline → Load from content_outlines
    ├─ status="draft" → /draft → Load from content_drafts
    └─ status="outputs" → /outputs → Load final outputs
```

---

## Notes

- **Upsert pattern**: Using `onConflict: 'session_id'` ensures we update existing records rather than creating duplicates
- **No migration needed**: Tables and columns already exist with proper RLS policies
- **Backward compatible**: Old sessions will simply have empty related tables (same as current behavior)
- **Auto-save**: 2-second debounce prevents excessive database writes while typing
