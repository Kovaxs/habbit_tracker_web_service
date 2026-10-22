# Application structure

## Boundaries

- `src/app/`: Next.js routes, layouts, and route-level composition. Keep business rules out of page files.
- `src/features/`: independent feature modules. Add implementation files only when needed.
- `src/components/ui/`: shared presentation components.
- `src/hooks/`: shared client hooks.
- `src/lib/`: small utilities and configuration. `config.ts` is for server and CLI use only.
- `src/server/db/`: SQLite connection and Drizzle schema. Application code accesses the database through the server-only `index.ts` entry point.
- `drizzle/`: reviewed SQL migrations and migration metadata.
- `tests/unit/`: unit tests and database-adapter checks. Use temporary databases, not personal data.
- `docs/`: design and implementation decisions.

## Feature layout

Each feature can add these files or directories as it grows:

- `components/`: feature-specific interface components.
- `types.ts`: domain types safe to share with the client.
- `validation.ts`: input validation shared where appropriate.
- `service.ts`: server-side use cases and business rules.
- `repository.ts`: server-side queries through `@/server/db`.
- `actions.ts`: server actions that validate input and call services.

Mark server modules with `import "server-only"`. Use `"use server"` for server-action entry points. Never import a repository into a client component. Keep shared domain rules independent of React and database APIs. Avoid cross-feature imports of internal files.

## Data model

The schema is defined in `src/server/db/schema.ts` and applied by one reviewed migration in `drizzle/`:

- `habits`: name (unique), kind (`count` or `completion`), tracking (`daily` or `hourly`), direction (`increase` or `decrease`), target, unit, start date, tracked hour range, review hour, archive flag, and creation time. Completion habits must have a target of 1 with an increase goal. Database checks keep these rules true for all rows.
- `entries`: one row per recorded period, keyed by habit, date, and slot. A daily habit uses slot `-1`. An hourly habit uses the hour from 0 to 23. A value of `0` means "reviewed, with no occurrences". A missing row means "not reviewed". Blank cells never become zeroes.
- `notes`: one row per date, with weekly helped and difficult text.

Dates are `YYYY-MM-DD` strings in the workbook's local time. Hours are whole numbers. All writes go through one synchronous SQLite transaction per server action.

Imported habits must use hourly decrease counts with a full-day grid (00:00–24:00), because that is what the source workbook records. Progress plots must show recording coverage: an unrecorded period is not a successful period.

## Runtime

Use the Node.js runtime for SQLite. Do not use the Edge runtime for database routes. Database connections open on demand, not during the static home-page build. Database files live outside application source and public assets.

Authentication and deployment are not implemented. Development and start scripts bind to localhost. Do not expose the app to an untrusted network before access controls are defined.
