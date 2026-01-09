# Index Upgrade Progress

## Iteration 1

### Completed
(none yet)

### Current Task
- [ ] Create src/lib/chunking.ts (word-based, ~800 words, 10% overlap)

### Next Tasks
- [ ] Update src/lib/pinecone/embed-research.ts
- [ ] Update src/lib/pinecone/search.ts
- [ ] Update scripts/import-posts.ts
- [ ] Update src/app/api/sync/route.ts
- [ ] Update src/app/api/cron/sync/route.ts
- [ ] Create scripts/reindex-all.ts
- [ ] Update .env.local PINECONE_HOST

---

## Task Checklist
- [ ] Create src/lib/chunking.ts (word-based, ~800 words, 10% overlap)
- [ ] Update src/lib/pinecone/embed-research.ts (Vercel AI SDK text-embedding-3-large, 3072 dims)
- [ ] Update src/lib/pinecone/search.ts (adjust for 3072 dims, update to new index host)
- [ ] Update scripts/import-posts.ts (chunking + full content + YAML frontmatter in metadata)
- [ ] Update src/app/api/sync/route.ts (same chunking logic)
- [ ] Update src/app/api/cron/sync/route.ts (same chunking logic)
- [ ] Create scripts/reindex-all.ts (re-embed from Supabase imported_posts)
- [ ] Update .env.local PINECONE_HOST to new index

## Success Criteria
- [ ] All 8 tasks checked off
- [ ] npm run build passes with zero errors
- [ ] npm run lint passes
- [ ] reindex script exists and can be invoked without immediate crash
- [ ] .env.local updated with new PINECONE_HOST
