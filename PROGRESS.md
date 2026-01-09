# Index Upgrade Progress

## Status: ✅ COMPLETE

## Task Checklist
- [x] Create src/lib/chunking.ts (word-based, ~800 words, 10% overlap)
- [x] Update src/lib/pinecone/embed-research.ts (Vercel AI SDK text-embedding-3-large, 3072 dims)
- [x] Update src/lib/pinecone/search.ts (adjust for 3072 dims, update to new index host)
- [x] Update scripts/import-posts.ts (chunking + full content + YAML frontmatter in metadata)
- [x] Update src/app/api/sync/route.ts (same chunking logic)
- [x] Update src/app/api/cron/sync/route.ts (same chunking logic)
- [x] Create scripts/reindex-all.ts (re-embed from Supabase imported_posts)
- [x] Update .env.local PINECONE_HOST to new index

## Success Criteria
- [x] All 8 tasks checked off
- [x] npm run build passes with zero errors
- [x] npm run lint passes (via npx eslint)
- [x] reindex script exists and can be invoked without immediate crash
- [x] .env.local updated with new PINECONE_HOST

## Commits Made
1. `feat: Create chunking.ts with word-based chunking and YAML frontmatter`
2. `feat: Update embed-research.ts to use Vercel AI SDK with text-embedding-3-large`
3. `feat: Update search.ts to use Vercel AI SDK with text-embedding-3-large and add chunk metadata`
4. `feat: Update import-posts.ts with chunking, Vercel AI SDK, and full content metadata`
5. `feat: Update sync route with chunking, Vercel AI SDK, and full content metadata`
6. `feat: Update cron sync route with chunking, Vercel AI SDK, and full content metadata`
7. `feat: Create reindex-all.ts script for re-embedding from Supabase to new Pinecone index`

## New Pinecone Index
- Host: `content-master-pro-v2-h9g6rmn.svc.aped-4627-b74a.pinecone.io`
- Dimensions: 3072
- Metric: cosine
- Embedding Model: `text-embedding-3-large` (via Vercel AI SDK)

## Next Steps (Manual)
1. Run the reindex script to populate the new index:
   ```bash
   npx tsx scripts/reindex-all.ts
   ```
2. Test queries against the new index
3. Update Vercel environment variables with new PINECONE_HOST
