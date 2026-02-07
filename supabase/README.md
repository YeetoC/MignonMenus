# Supabase migrations

This folder contains SQL migrations for the Supabase Postgres schema.

## Add a new migration

- Create a new file in `supabase/migrations/` with a timestamp prefix, e.g. `YYYYMMDDHHMMSS_description.sql`.
- Keep migrations additive and reviewed in git.

## Apply migrations

You can apply migrations in one of these ways:

### Apply using Supabase CLI

1. Install the Supabase CLI.
2. Link your local project to the remote Supabase project.
3. Push migrations.

### Apply using Supabase MCP

If you are using the Supabase MCP in this IDE, apply the SQL from a migration file via the MCP migration tool so the schema change is tracked and repeatable.
