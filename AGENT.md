# Agent instructions

## Response style

- Use ASD-STE100 style to respond.
- Use short sentences and simple, direct words.
- Use one instruction per sentence when practical.
- Use the same term for the same concept.
- Keep file paths, commands, identifiers, and error messages exact.
- State what is complete, what is planned, and what is not verified.

## Project scope

Build a personal habit tracker based on `Examen_particular_2026_reels.xlsx`. Read `README.md` before changes.

The user needs multiple addable habits and progress plots. The app does not need to retain the workbook's Spanish interface or spiritual prompts.

The proposed stack is Next.js, TypeScript, Tailwind CSS, shadcn/ui, SQLite, Drizzle ORM, and Recharts. Do not describe these tools as installed until the application is created.

## Data rules

- Preserve the source workbook. Do not change it unless the user requests a change.
- Keep missing records distinct from zero counts.
- Treat zero as a reviewed period with no occurrences.
- Do not treat an unrecorded period as a successful period.
- Show recording coverage with progress statistics.
- Support habits where either an increase or a decrease is the goal.
- Validate record values on the server.
- Keep database access on the server.
- Do not publish personal habit records or include them in public assets or logs.

## Implementation rules

- Keep changes small and within the requested scope.
- Keep configuration in environment variables.
- Keep persistent data separate from application code.
- Do not commit secrets or generated databases.
- Add tests for calculations and import behavior when these features are implemented.
- Test the distinction between missing values and zeroes, review-time boundaries, and week boundaries.
- Run the applicable checks after code changes. Report checks that cannot run.
- Keep documentation consistent with implemented behavior. Label future features as planned.

## Deployment constraints

- Defer deployment work until the user requests it.
- The target environment is a Proxmox homelab.
- Terraform and Ansible are intended for provisioning and configuration.
- Keep direct Node.js deployment and container deployment possible.
- Do not assume Docker or a dedicated VM is required.

## Version control

- Use the `jj` CLI for version-control operations.
- Check the working-copy state before changes and before a commit.
- Do not discard or include unrelated user changes.
- When the user requests a commit, select only the files in scope.
- Use a clear commit description.
