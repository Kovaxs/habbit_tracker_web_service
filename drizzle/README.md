# Database migrations

This directory will contain generated SQL migrations and Drizzle metadata. The schema is empty at this stage.

After tables are defined in `src/server/db/schema.ts`, run `npm run db:generate`. Review the generated SQL. Run `npm run db:migrate` to apply it to the configured database. Back up existing data before a migration.

Do not put personal records or database files here.
