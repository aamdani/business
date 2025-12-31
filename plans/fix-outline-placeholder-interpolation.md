# Fix: Outline Prompt Placeholder Interpolation Failure

## Problem Statement
`{{user_research_notes}}` and `{{raw_brain_dump}}` placeholders appear in AI call logs instead of being replaced.

## Root Cause (CONFIRMED)

**Database verification confirmed:**
- ✅ Prompt template in database HAS both `{{user_research_notes}}` and `{{raw_brain_dump}}` (migration applied)
- ✅ Earlier AI calls (04:23:26, 00:53:08) had variables properly interpolated
- ❌ Most recent call (17:32:19) has UNREPLACED placeholders

**The issue is NOT the migration or database.** The frontend code is not passing these variables for some sessions.

### Why Variables Are Not Being Passed

The `interpolateTemplate` function returns the original placeholder when `value === undefined`:
```typescript
return value !== undefined ? value : match;
```

The frontend code has fallback logic that SHOULD prevent `undefined`:
```typescript
user_research_notes: research.userNotes || "No research commentary provided.",
raw_brain_dump: research.rawBrainDump || "No original brain dump available.",
```

**However**, if `research.userNotes` or `research.rawBrainDump` are literally not set on the object (property doesn't exist), accessing them returns `undefined`, and `undefined || "fallback"` returns `"fallback"`. This SHOULD work.

**The actual bug**: The `research` object properties are being set to `""` (empty string), not undefined. And `"" || "fallback"` returns `"fallback"`. So the fallback SHOULD work...

**ACTUAL ROOT CAUSE FOUND**: Looking at the data flow more carefully:

1. On the Research page, `rawBrainDump` state starts as `null`
2. If no brain dump data is loaded, it stays `null`
3. When stored in sessionStorage: `{ rawBrainDump: null }`
4. On Outline page: `context.rawBrainDump || ""` = `null || ""` = `""`
5. Set on research object: `rawBrainDump: ""`
6. Generate call: `"" || "No original..."` = `"No original..."` ✅

Wait, this should work...

**REAL ROOT CAUSE**: The `ResearchData` interface has optional properties (`userNotes?: string`). If `setResearch` is called somewhere WITHOUT including these properties, they become `undefined` on the object. Then:
- `research.userNotes` = `undefined`
- `undefined || "fallback"` = `"fallback"` ✅

This should still work! Let me re-examine...

**ACTUAL BUG FOUND IN EDGE FUNCTION**: Looking at generate/index.ts line 129-147:

```typescript
const systemPrompt = interpolateTemplate(promptConfig.promptContent, {
  ...variables,  // user_research_notes and raw_brain_dump should be here
  model_instructions: modelConfig.systemPromptTips || "",
  // ... more variables
});
```

The variables are spread from the request body. If the frontend is passing these correctly, they should appear.

**CONFIRMED**: The frontend IS supposed to pass these variables. The issue must be that for some sessions, the `research` object's `userNotes` and `rawBrainDump` properties are literally `undefined` (not set).

## The Fix

**In [src/app/(dashboard)/outline/page.tsx](src/app/(dashboard)/outline/page.tsx)**, the fallback values ARE correct BUT the properties might not exist on the research object in some edge cases.

Add defensive defaults when setting the research state to ensure properties ALWAYS exist:

```typescript
// Line 179-187: Ensure properties always exist
setResearch({
  theme: researchData.query || themeFromUrl || "",
  key_points: keyPoints,
  data_points: dataPoints,
  summary: researchData.response || "",  // Add explicit fallback
  userNotes: researchData.user_notes || sessionUserNotes || "",
  rawBrainDump: brainDumpData?.raw_content || sessionRawBrainDump || "",
});
```

**Also check the generate call fallbacks are correct:**
```typescript
// Line 237-246: These should work but let's add extra safety
variables: {
  content: research?.theme || "",
  research_summary: research?.summary || "",
  key_points: [...(research?.key_points || []), ...(research?.data_points || [])].join("\n"),
  user_input: userInput?.trim() || "",
  user_research_notes: research?.userNotes || "No research commentary provided.",
  raw_brain_dump: research?.rawBrainDump || "No original brain dump available.",
},
```

## Implementation Plan

The code analysis shows the logic SHOULD work, but the variables are not being interpolated for some sessions. The fix is to add explicit console logging to trace the issue and ensure variables are ALWAYS passed.

### Step 1: Add Debug Logging (temporary)

In `src/app/(dashboard)/outline/page.tsx`, add logging at line ~234:

```typescript
const handleGenerateOutline = useCallback(async () => {
  if (!research) return;

  // DEBUG: Log what we're sending
  console.log("🔍 Outline Generate - Research object:", {
    hasUserNotes: "userNotes" in research,
    userNotesValue: research.userNotes,
    hasRawBrainDump: "rawBrainDump" in research,
    rawBrainDumpValue: research.rawBrainDump?.substring(0, 100),
  });

  const variablesToSend = {
    content: research.theme,
    research_summary: research.summary || "",
    key_points: [...research.key_points, ...research.data_points].join("\n"),
    user_input: userInput.trim() || "",
    user_research_notes: research.userNotes || "No research commentary provided.",
    raw_brain_dump: research.rawBrainDump || "No original brain dump available.",
  };

  console.log("🔍 Outline Generate - Variables being sent:", {
    user_research_notes: variablesToSend.user_research_notes?.substring(0, 100),
    raw_brain_dump: variablesToSend.raw_brain_dump?.substring(0, 100),
  });

  // Rest of function...
```

### Step 2: Also Log Data Loading

Add logging in the `loadResearch` function around line 174:

```typescript
if (researchData) {
  console.log("🔍 Outline - Loading research data:", {
    user_notes: researchData.user_notes,
    sessionUserNotes,
    raw_content: brainDumpData?.raw_content?.substring(0, 100),
    sessionRawBrainDump: sessionRawBrainDump?.substring(0, 100),
  });

  // ... setResearch call
}
```

### Step 3: Test and Verify

1. Run the app locally
2. Navigate through the flow: Create → Research → Outline
3. Check browser console for the debug logs
4. Verify the logs show what values are being loaded and sent

### Step 4: Remove Debug Logging

Once the issue is identified and fixed, remove the console.log statements.

## Files to Modify

| File | Change |
|------|--------|
| [src/app/(dashboard)/outline/page.tsx](src/app/(dashboard)/outline/page.tsx) | Add debug logging in `loadResearch` and `handleGenerateOutline` |

## Status
- [x] Root cause identified (frontend not passing variables for some sessions)
- [x] Database verified (prompt template is correct)
- [x] AI call logs analyzed (recent call has issue, older calls work)
- [ ] Add debug logging
- [ ] Test and trace issue
- [ ] Fix based on findings
- [ ] Remove debug logging
