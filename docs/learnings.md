# Accumulated Learnings

Lessons learned during the build process. Future sessions should read this first.

---

## Session 1 (2024-12-27)

### Next.js 15 Setup
- Use `npx create-next-app@latest` with flags: `--typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack`
- React Compiler prompt: Choose "No" for now (experimental)
- Tailwind CSS v4 is now the default

### shadcn/ui
- Use `npx shadcn@latest init -d` for defaults
- Use `npx shadcn@latest add <components> -y` to skip prompts
- Tailwind v4 is auto-detected
- Creates `src/lib/utils.ts` with `cn()` function

### Project Patterns
- All colors should use CSS variables from globals.css
- Use semantic color classes: `text-foreground`, `text-muted-foreground`, `bg-background`
- Never use hardcoded colors like `text-white` or `text-black`
