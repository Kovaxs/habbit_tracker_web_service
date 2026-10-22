# Habit Tracker

A planned web app for personal habit tracking. The app is based on the workflow in `Examen_particular_2026_reels.xlsx`.

## Project status

This repository contains the source workbook and project documentation. The app is not implemented. There are no build, test, or run commands yet.

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

## Planned features

- Add and edit habits.
- Support occurrence-count habits and completion habits.
- Set whether progress means an increase or a decrease in a behavior.
- Provide daily entry and a weekly overview.
- Show progress history and plots with recording coverage.
- Support reflection notes.
- Import existing records from the workbook.

These features are planned, not available. Details of habit targets, authentication, and import behavior remain to be defined.

## Proposed technology stack

| Area | Technology | Purpose |
| --- | --- | --- |
| Application | Next.js and TypeScript | One app for the interface and server logic |
| Interface | Tailwind CSS and shadcn/ui | Responsive pages and reusable components |
| Database | SQLite | Persistent storage without a separate database service |
| Database tooling | Drizzle ORM | Typed queries and schema migrations |
| Charts | Recharts | Habit progress plots |

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
