# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow. The files in `context/` define what to build, how to build it, and the current state of progress. Always implement against these specs. Do not infer or invent behavior from scratch.

At the start of every session, read these in order: `project-overview.md`, `architecture.md`, `code-standards.md`, `ai-workflow-rules.md`, `progress-tracker.md`. Then state in two or three lines which unit you are working on and which files you expect to create or change.

The owner is comfortable with React but is a beginner with Express and MongoDB. Explain new backend concepts briefly and in plain language, and keep the code readable.

## Scoping Rules

- Work on one feature unit at a time. A unit is one row in "Next Up" in `progress-tracker.md`.
- A unit is built vertically and finished end to end: model, service, routes, validation, tests, then the UI wired to the real API.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.
- Never start the next unit while the current one is half done.

## When to Split Work

Split an implementation step if it combines:

- Backend API changes and a large frontend rework in the same step. Do the API and its tests first, then the UI.
- Changes to the data model of more than one module (for example Students and Fees together).
- Authentication or permission changes together with feature work.
- New infrastructure (hosting, CI, dependencies) together with feature work.
- Behavior that is not clearly defined in the context files.

If a change cannot be verified end to end quickly (an endpoint tested with a real request, a screen checked in the browser), the scope is too broad. Split it.

## Handling Missing Requirements

- Do not invent product behavior that is not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing. Propose the smallest sensible default and ask the owner to confirm it.
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing. Do not block on it if a safe default exists. Record the default you used.
- If the existing code conflicts with the specs, tell the owner what you found. Do not silently rewrite large parts of the app.

## Protected Files

Do not modify the following unless explicitly instructed:

- `.env` and any file containing real secrets. Only edit `server/.env.example`.
- `package-lock.json` by hand. Let the package manager update it.
- Existing shared UI primitives in `src/components/` when the task is not a UI change. Extend them, do not rewrite them.
- Existing migrations or seed data that has already run in a shared environment. Add a new one instead.
- The `auditLogs` and `feePayments` models' append-only behavior. Never add update or delete paths for them.

Never do the following without explicit approval:

- Run destructive database commands (`dropDatabase`, `deleteMany({})`, collection drops) or any command against a production database.
- Run `npm audit fix --force`, upgrade major versions of core dependencies, or remove tests.
- Print, paste or commit secrets, connection strings or passwords. If one appears in a file or output, say so and recommend rotating it.

## Keeping Docs in Sync

Update the relevant context file in the same change whenever implementation changes:

- System architecture, boundaries, data model or permission matrix: `architecture.md`
- Code conventions or standards: `code-standards.md`
- Feature scope, roles or user flows: `project-overview.md`
- Completed work, decisions, open questions: `progress-tracker.md`

If code and docs disagree, fix whichever is wrong before moving on. Do not leave them inconsistent.

## Definition of Done for a Unit

1. The unit works end to end within its defined scope: API verified with real requests, UI verified in the browser, no remaining mock data for that module.
2. Permissions are enforced on the server for every role in the matrix, with tests for allowed and forbidden cases.
3. No invariant defined in `architecture.md` was violated.
4. Tests for the unit exist and pass. `npm run lint`, `npm test` and `npm run build` pass.
5. `server/.env.example` and docs are updated if configuration or behavior changed.
6. `progress-tracker.md` reflects the completed work, new decisions and open questions.
7. Work is committed on the unit's branch with a clear message.

## Before Moving to the Next Unit

1. The Definition of Done above is fully satisfied.
2. Give the owner a short plain-language summary: what was built, how a request flows through the new files, how to run and test it, and what is next. Keep it brief and skip a step-by-step recap of every command.
3. Wait for the owner to confirm before starting the next unit when the next unit changes authentication, the data model, money handling or deployment.
