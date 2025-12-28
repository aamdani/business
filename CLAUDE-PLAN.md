# Planning Workflow

A structured approach for planning non-trivial implementations. Use this workflow when tasks involve multiple files, architectural decisions, or significant changes.

## When to Plan

**Plan when:**
- Task touches 3+ files
- Multiple valid implementation approaches exist
- Architectural decisions are needed
- You're unsure of the full scope

**Skip planning for:**
- Single-line fixes
- Typos
- Simple renames
- Tasks with explicit, detailed instructions

---

## Critical: Plan Persistence (Rule 14)

**Plans in `~/.claude/plans/` are EPHEMERAL.** They do not survive context compaction.

**ALWAYS copy plans to `./plans/` FIRST.** This ensures:
- Plans persist across context boundaries
- Plans survive conversation summarization
- Future sessions can reference past work

```bash
# Step 0 of EVERY plan execution
cp ~/.claude/plans/[plan-name].md ./plans/<descriptive-name>.md
```

Then work from the copy in `./plans/`, not the original.

---

## Planning Phases

### Phase 1: Understand

**Goal:** Fully understand the request before designing a solution.

1. **Explore the codebase** using Explore agents (1-3 in parallel)
   - Search for existing implementations
   - Find related components
   - Identify patterns to follow

2. **Ask clarifying questions** using AskUserQuestion
   - Don't assume user intent
   - Clarify ambiguous requirements
   - Confirm scope boundaries

### Phase 2: Design

**Goal:** Create a concrete implementation plan.

1. **Use Plan agent** to design the approach
   - Provide context from Phase 1
   - Include file paths discovered
   - Describe requirements and constraints

2. **Plan should include:**
   - Problem statement
   - Implementation steps (checkboxes)
   - Files to modify (with paths)
   - New files to create
   - Database changes (if any)
   - Testing approach

### Phase 3: Review

**Goal:** Validate the plan before execution.

1. **Read critical files** identified in the plan
2. **Verify alignment** with user's original request
3. **Ask final questions** if needed
4. **Get user approval** before proceeding

### Phase 4: Execute

**Goal:** Implement the plan systematically.

1. **Copy plan to `./plans/`** (if not already done)
2. **Work through steps sequentially**
3. **Check off items** as you complete them
4. **Update plan** if scope changes
5. **Mark complete** when finished: add `## Status: ✅ Complete`

---

## Plan File Template

```markdown
# [Plan Title]

## Problem Statement
[Brief description of what needs to be fixed/built]

---

## Implementation Plan

### Phase 1: [First Major Step]
[Details]

### Phase 2: [Second Major Step]
[Details]

---

## Files to Modify
- `path/to/file1.ts` - [what changes]
- `path/to/file2.ts` - [what changes]

## New Files
- `path/to/new-file.ts` - [purpose]

---

## Execution Order

0. [ ] Copy this plan to `./plans/<name>.md`
1. [ ] First task
2. [ ] Second task
3. [ ] ...
n. [ ] Test end-to-end
n+1. [ ] Mark plan complete

---

## Notes
[Any gotchas, dependencies, or things to watch for]
```

---

## Tracking Progress

During execution:
- Use `TodoWrite` for real-time progress tracking
- Update checkboxes in the plan file as you complete steps
- If blocked, add notes to the plan explaining why

After completion:
- Add `## Status: ✅ Complete` at the top of the plan
- Keep the plan in `./plans/` for reference (don't delete)

---

## Why This Matters

1. **Context compaction loses `~/.claude/plans/`** - Claude's context window has limits. When conversations get long, earlier content gets summarized. Plans in `~/.claude/` disappear.

2. **`./plans/` is in the project** - Files here are re-read when context is rebuilt. Plans persist.

3. **Checkboxes show progress** - If context compacts mid-implementation, the plan file shows what's done vs remaining.

4. **History for future reference** - Completed plans document decisions made and approaches taken.
