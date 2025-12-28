# Supabase Migration & Seeding Best Practices

## 1. Migrations vs. Seed Files

**Migrations** (`supabase/migrations/`):
- Purpose: Schema changes (tables, columns, relationships, constraints)
- Content: DDL statements (CREATE, ALTER, DROP)
- When applied: First, in chronological order
- Should contain: **Base/reference data** required for your application to run

**Seed File** (`supabase/seed.sql`):
- Purpose: Test/development data only
- Content: DML statements (INSERT only - no schema changes)
- When applied: After all migrations complete (local only)
- Note: Remote databases don't run seed.sql automatically

## 2. Common Issues with `INSERT ... ON CONFLICT`

### Why Rows Might Not Insert:

1. **Missing unique constraint**: `ON CONFLICT` requires a unique constraint or primary key
2. **Composite key mismatch**: Multiple columns must be part of a single composite constraint
3. **Wrong column name**: The column in `ON CONFLICT` must exactly match the constraint

### Solutions:

```sql
-- Ensure unique constraint exists
ALTER TABLE your_table ADD CONSTRAINT unique_column UNIQUE (your_column);

-- Use WHERE NOT EXISTS for conditional inserts
INSERT INTO users (email, name)
SELECT 'test@example.com', 'Test User'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'test@example.com'
);
```

## 3. Why Migrations Silently Fail

### Common Silent Failure Scenarios:
- Migration marked as applied despite constraint errors on existing data
- No error logging for large migrations
- Trigger conflicts during seed/migration

### Debugging Checklist:

```bash
# 1. Check migration status
supabase migration list

# 2. Lint database for errors
supabase db lint

# 3. Repair migration history if needed
supabase migration repair --status reverted <timestamp>

# 4. Query migrations table directly
# SELECT * FROM supabase_migrations.schema_migrations;
```

## 4. Best Practices

### DO:
- Use `INSERT ... ON CONFLICT DO NOTHING` for idempotency
- Only include data insertions in seed files
- Test locally first: `supabase db reset`
- Write idempotent migrations (safe to run multiple times)
- Add indexes on columns you're checking

### DON'T:
- Don't add schema statements to seed files
- Don't put test data in migrations (only reference data)
- Don't assume remote and local environments are the same

## 5. Reference Data Pattern

```sql
-- Idempotent reference data in migrations
INSERT INTO subscription_types (id, name, price)
VALUES
  (1, 'free', 0),
  (2, 'pro', 9.99),
  (3, 'enterprise', 99.99)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price;
```

## 6. Conditional Logic Pattern

```sql
-- Use DO blocks for conditional inserts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com') THEN
    INSERT INTO users (email, role) VALUES ('admin@example.com', 'admin');
  END IF;
END $$;
```

## 7. Workflow

```bash
# 1. Create schema migration
supabase migration new create_tables

# 2. Add schema SQL to migration file

# 3. Create/update seed file for test data
# supabase/seed.sql

# 4. Test locally
supabase db reset

# 5. Push to remote
supabase db push
```
