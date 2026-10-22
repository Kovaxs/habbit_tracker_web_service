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

## Data model: next step

The schema is not defined yet. Before implementation, define habit types, goal direction, daily versus hourly record keys, local date/time handling, and the meaning of completed reviews. Keep missing values distinct from zero. Do not mix daily and hourly records in totals without an explicit rule.

Progress plots must show recording coverage. An unrecorded period is not a successful period. Define week and review-time boundaries in tests before workbook import.

## Runtime

Use the Node.js runtime for SQLite. Do not use the Edge runtime for database routes. Database connections open on demand, not during the static home-page build. Database files live outside application source and public assets.

Authentication and deployment are not implemented. Development and start scripts bind to localhost. Do not expose the app to an untrusted network before access controls are defined.
