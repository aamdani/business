# Ralph Wiggum Multi-Phase Implementation Best Practices

**Query:** Ralph Wiggum technique AI coding loop Geoffrey Huntley: best practices for multi-phase implementation projects
**Model:** sonar-pro
**Date:** 2026-01-29
**Cost:** $0.025

---

## Answer

**For multi-phase implementation projects using the Ralph Wiggum technique in AI coding loops, prefer multiple smaller, sequential Ralph loops that hand off via persistent state files over a single monolithic prompt.** This aligns with Geoffrey Huntley's best practices, avoiding context accumulation while enabling modular progress on complex builds.

### Core Ralph Wiggum Technique
The **Ralph Wiggum technique**, created by Geoffrey Huntley, is a simple iterative bash loop (e.g., `while :; do cat PROMPT.md | claude-code ; done`) that feeds the same prompt to an AI agent repeatedly until completion, using fresh context each iteration to combat "context rot" from accumulated history.

### Monolithic Prompt vs. Multiple Smaller Loops
- **Avoid monolithic prompts**: A single massive prompt for multi-phase projects risks overwhelming models, leading to incomplete outputs or early abandonment. Ralph thrives on simplicity and repetition within bounded tasks.
- **Use multiple smaller loops**: Break projects into granular phases (e.g., one loop for playground setup, another for feature implementation). Each loop reads/writes state files (e.g., `task.md`, `work-summary.txt`, `review-feedback.txt` in `.goose/ralph/`) for clean handoffs without conversation history bloat. Huntley emphasizes this "monolithic" single-process-per-task mindset over multi-agent complexity, likening it to vertical scaling rather than microservices.

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **One Monolithic Prompt** | Simpler setup for tiny tasks | Context overload, model fatigue on complex/multi-phase work | Single-step prototypes only |
| **Multiple Smaller Loops** | Fresh context per phase, incremental progress, easy tuning via feedback files | Requires manual orchestration/pauses between loops | **Multi-phase builds** (e.g., Electron browser tutorial: setup → code → test → ship) |

### Structuring Complex Multi-Step Builds
People structure these via **phased handoffs and enhancements**:
1. **Basic Single-Model Loop**: Repeat prompt until "done" signal (e.g., file `work-complete.txt`).
2. **Multi-Model Ralph (Goose Extension)**: Worker model codes → reviewer (different model/provider, e.g., GPT-4o → Claude Sonnet) critiques → loop until "SHIP" (max 10 iterations). Files persist feedback/summaries.
3. **Advanced Patterns**:
   - **Watch & Tune**: Monitor loops, add "signs" (prompt tweaks) for failure domains.
   - **Gas Town/Loom**: Orchestrate parallel loops for "evolutionary software" (level 9 autonomy), but start simple.
   - **Claude Plugin**: `/ralph` command with max iterations and "done" promise for integrated state management.
4. **Prompt Best Practices**: Start with task file, address feedback first, read existing code, signal status explicitly.

Huntley advises programming the **loop as the hero**, automating AFK for greenfield projects while rejecting multi-agent hype until basics master. For production, tune iteratively like a guitar.

---

## Citations

1. [Ralph Loop | goose - GitHub Pages](https://block.github.io/goose/docs/tutorials/ralph-loop/)
2. [Inventing the Ralph Wiggum Loop | Creator Geoffrey Huntley](https://devinterrupted.substack.com/p/inventing-the-ralph-wiggum-loop-creator)
3. [Claude Ralph - YouTube](https://www.youtube.com/watch?v=ny_BAA3eYaI)
4. [Everything is a Ralph Loop - Geoffrey Huntley](https://ghuntley.com/loop/)
5. [Ralph Wiggum as a "software engineer" - Geoffrey Huntley](https://ghuntley.com/ralph/)
6. [ghuntley/how-to-ralph-wiggum - GitHub](https://github.com/ghuntley/how-to-ralph-wiggum)
7. [Ralph Wiggum With Claude Code: How People Are Using It Effectively](https://blog.devgenius.io/ralph-wiggum-with-claude-code-how-people-are-using-it-effectively-1d03d5027285)

