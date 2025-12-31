# Claude Extended Thinking Feature

## Problem Statement

Add support for Claude's extended thinking (reasoning) capability to improve output quality for complex tasks like outline generation and draft writing. The feature should be:
- Configurable per-prompt in the Prompt Studio UI
- Only applied to Claude models that support it
- Properly logged for debugging and cost tracking

---

## Research Summary

**Verified Working:** The Vercel AI Gateway accepts a `reasoning` parameter in the request body:
```json
{
  "reasoning": {
    "enabled": true,
    "budget_tokens": 10000
  }
}
```

**Response Structure:** Reasoning text is returned at `choices[0].message.reasoning`

**Supported Models:**
- `anthropic/claude-sonnet-4-5` (claude-sonnet-4-5-20250929)
- `anthropic/claude-opus-4-5` (claude-opus-4-5-20251101)
- `anthropic/claude-haiku-4-5` (claude-haiku-4-5-20251001)
- `anthropic/claude-sonnet-4` (claude-sonnet-4-20250514)
- `anthropic/claude-opus-4` (claude-opus-4-20250514)

---

## Implementation Plan

### Phase 1: Database Schema Updates

Add `supports_thinking` to `ai_models` table to track which models support extended thinking.

Update `api_config` JSONB structure in `prompt_versions` to include:
```json
{
  "temperature": 0.7,
  "max_tokens": 4096,
  "reasoning_enabled": true,
  "reasoning_budget": 10000
}
```

### Phase 2: Edge Function Updates

Modify `callTextModel` and `callTextModelStreaming` to:
1. Check if the model supports thinking
2. If reasoning is enabled in prompt config, add `reasoning` object to request
3. Extract `reasoning` from response alongside `content`
4. Log reasoning content in `ai_call_logs` (new column or in existing `full_response`)

### Phase 3: Prompt Studio UI Updates

Add to the prompt editor:
1. Toggle for "Enable Extended Thinking" (only shown for thinking-capable models)
2. Slider/input for "Thinking Budget" (tokens)
3. Visual indicator when thinking is enabled

### Phase 4: Response Handling (Optional Enhancement)

Optionally expose reasoning text in the frontend for debugging/review.

---

## Files to Modify

- `supabase/migrations/YYYYMMDD_add_thinking_support.sql` - Add `supports_thinking` column
- `supabase/functions/_shared/models.ts` - Add `supportsThinking` to `ModelConfig`
- `supabase/functions/generate/index.ts` - Add reasoning to API calls
- `src/app/(dashboard)/studio/prompts/[id]/page.tsx` - Add UI controls

## New Files

- `supabase/migrations/20251230100000_add_thinking_support.sql` - Schema migration

---

## Execution Order

0. [x] Copy this plan to `./plans/claude-extended-thinking-feature.md`
1. [x] Create database migration to add `supports_thinking` to `ai_models`
2. [x] Update `ai_models` seed data to mark Claude models as thinking-capable
3. [x] Update `_shared/models.ts` to include `supportsThinking` in config
4. [x] Modify `callTextModel()` to conditionally add `reasoning` parameter
5. [x] Modify `callTextModelStreaming()` to handle reasoning in streamed responses
6. [x] Update `AICallResult` type to include optional `reasoning` field
7. [x] Add UI controls to Prompt Studio editor
8. [x] Deploy Edge Functions and run migration
9. [ ] Test with a prompt (e.g., `outline_generator`) - User testing
10. [x] Mark plan complete

## Status: ✅ Complete

---

## Notes

**Budget Recommendations:**
| Use Case | Budget | Notes |
|----------|--------|-------|
| Quick tasks | 1,024-4,000 | Simple analysis |
| Standard | 8,000-16,000 | Good default |
| Complex (outlines, drafts) | 16,000-32,000 | Recommended for your use case |

**Cost Impact:**
- Thinking tokens are billed as output tokens
- You're charged for full thinking, not just the summary (Claude 4 models return summarized thinking)

**Constraints:**
- `budget_tokens` must be less than `max_tokens`
- Thinking is incompatible with temperature/top_k modifications
- Can't pre-fill responses when thinking is enabled

**Default Strategy:**
- Start disabled by default
- Enable for specific prompts: `outline_generator`, `draft_writer`, etc.
- Use 16K budget as starting point for complex tasks
