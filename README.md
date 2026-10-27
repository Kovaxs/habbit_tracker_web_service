# Habit Tracker

A web app project for personal habit tracking. The app is based on the workflow in `Examen_particular_2026_reels.xlsx`.

## Project status

The core app is implemented and covered by automated tests:

- Habits with occurrence-count or completion goals, daily or hourly tracking, and increase or decrease directions.
- Today view with daily entry, an hourly grid, review status, and weekly notes.
- Progress view with charts, recording coverage, and a daily values table.
- Manage view with edit, archive, restore, JSON export, and workbook import.
- Workbook import with a preview step. Blank cells stay unrecorded and existing data is never overwritten.
- A responsive mobile-first interface tested on small screens.

Authentication and deployment are not implemented. JSON restore is not available.

## Local setup

Use Node.js 24 LTS (see `.nvmrc`) and npm. Node.js 26 is also supported. Clean installs, checks, and production builds passed on Node.js 24 and 26. SQLite uses a native dependency. If a prebuilt binary is not available for your system, installation requires Python and C/C++ build tools.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://127.0.0.1:3000>. The server binds to localhost. Do not expose it to an untrusted network. Access controls are not implemented.

`DATABASE_PATH` sets the SQLite file location. The default is `./data/habit-tracker.sqlite`. Relative paths resolve from the project root. The starter page does not open the database. Database files and local environment files are ignored by version control.

## Commands

| Command               | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Start the local development server           |
| `npm run build`       | Build the app for production                 |
| `npm start`           | Run the built app on localhost               |
| `npm run lint`        | Check code with ESLint                       |
| `npm run typecheck`   | Generate route types and check TypeScript    |
| `npm test`            | Run unit and database-adapter tests          |
| `npm run test:watch`  | Run tests in watch mode                      |
| `npm run check`       | Run lint, type checks, and tests             |
| `npm run db:generate` | Generate migrations after tables are defined |
| `npm run db:migrate`  | Apply generated migrations                   |

The database schema is defined in `src/server/db/schema.ts`. Migrations in `drizzle/` are applied automatically when the database opens. Run `npm run db:generate` only after you change the schema, then review the generated SQL before you commit it. Database commands load development environment files by default, like `next dev`. Set `NODE_ENV=production` when running them against a deployed database. A `DATABASE_PATH` set directly in the process environment takes priority.

Server actions accept request bodies up to 3 MB. This leaves room for multipart overhead above the 2 MB workbook limit.

### Dependency audit

ESLint is pinned to version 9 for compatibility with the plugins in `eslint-config-next`. npm marks this version as unsupported. Update the lint toolchain when its plugins support ESLint 10.

At setup, `npm audit --omit=dev` reports no vulnerabilities. The full audit reports nine findings in development dependencies: five high-severity findings in the Next.js lint dependency chain (`braces`), and four moderate findings in the Drizzle Kit dependency chain (`esbuild`). The proposed automatic fixes require breaking changes. Do not run `npm audit fix --force` without a compatibility review. Check upstream fixes before deployment.

## Project structure

```text
src/
  app/                  # Routes, layout, and starter page
  components/ui/        # Shared UI components (reserved)
  features/
    habits/             # Habit definitions and goals
    tracking/           # Daily and hourly records
    progress/           # Statistics and plots
    reflections/        # Reflection notes
    imports/            # Workbook import
  hooks/                # Shared client hooks (reserved)
  lib/                  # Utilities and server/CLI configuration
  server/db/            # SQLite connection and Drizzle schema
drizzle/                # Generated migrations (reserved)
tests/unit/             # Unit and database-adapter tests
docs/                   # Architecture notes
```

Feature folders contain working features. See `docs/architecture.md` for module boundaries.

## Goals

- Let the user add and manage multiple habits.
- Show progress plots for each habit.
- Support daily records and optional hourly records.
- Keep the distinction between a reviewed period with no occurrences and a period with no record.
- Run on a home server and keep data under the user's control.

The app does not need to retain the Spanish interface or spiritual prompts from the workbook.

## Source workflow

The workbook tracks a purpose, such as “No ver reels,” in weekly sheets. Each sheet has:

- A Monday-to-Sunday grid with one row for each hour.
- Counts of occurrences for each reviewed hour.
- Two daily reviews, with a configurable first-review time. The current value is 14:00.
- Totals before and from the first-review time, daily totals, and a weekly total.
- A count of reviewed hours.
- Notes about what helped or caused difficulty.

A value of `0` means that the hour was reviewed and had no occurrences. An empty cell means that the hour was not reviewed or was outside waking hours. Empty cells must not become zeroes during import or analysis.

## Implemented features

- Add, edit, archive, and restore habits.
- Occurrence-count habits and completion habits.
- Increase or decrease goals, with a daily or hourly record grid.
- Daily entry, a weekly overview, and progress plots with recording coverage.
- Reflection notes per week.
- Workbook import with preview and idempotent reimport.

Not implemented yet: authentication, JSON restore, and deployment automation.

## Technology stack

| Area             | Technology                 | Purpose                                                |
| ---------------- | -------------------------- | ------------------------------------------------------ |
| Application      | Next.js and TypeScript     | One app for the interface and server logic             |
| Interface        | Tailwind CSS and shadcn/ui | Responsive pages and reusable components               |
| Database         | SQLite                     | Persistent storage without a separate database service |
| Database tooling | Drizzle ORM                | Typed queries and schema migrations                    |
| Charts           | Recharts                   | Habit progress plots                                   |

The core dependencies are installed and used. Recharts draws the progress plots. Shared UI components use Tailwind CSS with Radix primitives.

Use server-side access for the database. Keep configuration in environment variables. Keep persistent data separate from application code.

## Deployment plan

Deployment will be addressed after app development. The target is a Proxmox homelab.

Two options remain open:

1. Run the app as a Node.js service directly in a VM.
2. Run the app in a container on a shared Docker VM with other services.

Terraform is intended to provision infrastructure. Ansible is intended to configure the server and deploy the app. Docker is not a requirement at this stage.

Use persistent local-disk storage for SQLite. Define backups, restore procedures, access controls, and remote access before deployment.

## Development guidance

See `AGENT.md` for coding-agent instructions. Use the Jujutsu (`jj`) CLI for version-control operations.
