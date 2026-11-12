# Prisma in apps/api

This schema is a copy of `apps/web/prisma/schema/*.prisma`, pointed at the same `DATABASE_URL`. It exists so apps/api can read/write the same tables as apps/web while both apps run side by side during the migration.

- **Never run `prisma migrate` from apps/api.** Migrations stay owned by apps/web until the schema formally moves to a shared package (e.g. `packages/database`). Only run `prisma generate` here.
- When a model changes in apps/web's schema, copy the same change into this folder and re-run `pnpm --filter @zentlet/api db:generate`.
