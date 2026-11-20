# Code Standards

## General

- Keep modules small and single-purpose. One module folder owns one domain.
- Fix root causes. Do not layer workarounds or leave commented-out code.
- Do not mix unrelated concerns in one file, component or route.
- Prefer boring, readable code over clever code. The owner is learning Express and MongoDB, so add short comments for non-obvious logic (why, not what).
- Reuse existing helpers and components before creating new ones. Do not add a dependency that duplicates something already installed.
- No dead code, no unused files, no `console.log` left behind. Use the logger on the server.

## Language and Tooling

- Backend: JavaScript with ES modules (`"type": "module"`), Node LTS. Use `async/await`, no callbacks.
- Frontend: keep the language the project already uses (check the existing files). Do not convert files between JavaScript and TypeScript as a side effect of other work. If the project is TypeScript, strict mode stays on and `any` is avoided.
- ESLint and Prettier are required. Lint and formatting must pass before a unit is done.
- Use named exports. Avoid default exports except where the framework expects them.
- Constants (roles, statuses, enums) live in `server/src/constants/` and are imported everywhere. No magic strings like `"admin"` scattered in code.

## Express and Mongoose

- One router per module, mounted under `/api/v1/<resource>`.
- Controllers are thin: `validated input -> one service call -> response`. Wrap async handlers in `asyncHandler` so errors reach the central error handler.
- Services contain business rules, ownership checks, transactions and audit entries.
- Throw `ApiError(status, code, message, details?)` for expected failures. Never send raw errors or stack traces to the client in production.
- Schemas: `timestamps: true`, `strict` mode, explicit `enum` values from constants, indexes declared in the schema, `toJSON` transform that removes `__v` and `passwordHash`.
- Reads that return data to the API use `.lean()` and `.select()` to return only needed fields. Never return a whole user or guardian document by default.
- Use `session.withTransaction()` for multi-document writes. Keep transactions short.
- Never build a query from raw request input. Validate first, then use whitelisted fields only.
- Sequence numbers (admission, voucher, receipt) come from the `counters` collection using an atomic `$inc`.
- Cache the database connection at module level so the app works on both a long-running server and serverless.

## React

- Organize by feature: `src/features/<module>/` with `pages/`, `components/`, `api.js` (or `.ts`) and `hooks/`.
- All HTTP calls go through the shared API client in `src/lib/`. No `fetch` or `axios` calls inside components.
- Server data is handled with TanStack Query (or the existing data layer if one is already in use). Do not copy server data into global state.
- Every data view handles four states: loading, error (with retry), empty, and success.
- Forms use react-hook-form with Zod. Disable the submit button while submitting. Show server validation errors next to the right field.
- Permission checks in the UI use one helper (`can(user, permission)`) and a `<RequireRole>` route guard. Do not scatter `user.role === "admin"` checks around components.
- Keep components under about 200 lines. Extract when a component does more than one job.
- Tokens: the access token lives in memory only. Never store tokens in `localStorage` or `sessionStorage`.
- Replace mock data feature by feature. When a feature moves to the API, delete its mock data in the same change.

## Styling

- Keep the existing design language of the current dashboard: sidebar layout, indigo primary color, rounded cards, status pills, clean tables. Use the styling system the project already uses (check `package.json` and config files before adding anything).
- Use design tokens or the existing theme values. No new hardcoded hex colors if tokens exist.
- Responsive down to 360 px wide. Tables collapse to stacked cards on small screens.
- Every interactive element is keyboard reachable and has a visible focus state. Inputs have labels.
- Format money as `Rs 12,500`, dates as `DD MMM YYYY`, in one shared formatter.

## API Routes

- Base path `/api/v1`. Plural nouns, kebab-case: `/students`, `/fee-vouchers`, `/exam-subjects`. Actions that are not CRUD are sub-resources: `POST /fee-vouchers/:id/payments`, `POST /exams/:id/publish`.
- Order of middleware on every route: authenticate, authorize by role, validate input, then the controller.
- Validate and parse `body`, `params` and `query` with Zod before any logic runs. Strip unknown fields.
- Enforce ownership in the service before any read or mutation of another user's data.
- Responses use one shape.

```
Success:  { "success": true, "data": <object or array>, "meta": { "page": 1, "limit": 20, "total": 240 } }
Failure:  { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Human readable text", "details": [ { "path": "email", "message": "Invalid email" } ] } }
```

- `meta` appears only on paginated lists.
- Status codes: 200 OK, 201 Created, 204 No Content, 400 invalid input, 401 not authenticated, 403 not allowed, 404 not found (also used to avoid revealing that another family's record exists), 409 conflict (duplicate, locked), 429 rate limited, 500 unexpected.
- List endpoints accept `page`, `limit`, `sort`, `q` and whitelisted filters. `limit` is capped at 100.
- Never expose Mongo internals (`__v`, raw error messages, index names).

## Data and Storage

- Money is an integer number of PKR. Never use floats for money. Compute totals on the server.
- Business dates are strings: attendance `YYYY-MM-DD`, voucher period `YYYY-MM`. Timestamps are UTC `Date`.
- Payments and audit logs are append-only. To correct a payment, create a reversal record linked to it.
- Soft delete (`status` or `deletedAt`) for anything with history. Hard delete is allowed only for draft records that nothing references.
- Every write to fees, marks, attendance (after the edit window), users and roles creates an audit entry with before and after values (without secrets).
- Metadata and business data belong in MongoDB. Files belong in object storage with only the URL stored. Generated PDFs and CSVs are streamed and not saved.
- Seed and demo data lives in `server/src/seed/` and must never run in production.

## Security

- Passwords hashed with bcrypt (cost 12). Minimum password length 8. Never log or return a password or token.
- Helmet enabled. CORS uses an exact origin allow-list from `CLIENT_ORIGINS`, never `*` with credentials.
- Rate limit all routes lightly and auth routes strictly.
- `.env` files are never committed. `server/.env.example` is committed with placeholder values only.
- Treat CNIC, phone numbers and addresses as sensitive: mask them in list responses where full values are not needed, and keep them out of logs.
- Run `npm audit` and review results. Do not run `npm audit fix --force`.

## Testing

- Backend uses Vitest, supertest and mongodb-memory-server in replica-set mode (needed for transactions).
- Every service with business rules has unit tests for the rules.
- Every route has at least: a success case, an unauthenticated case (401), a wrong-role case (403) and an invalid-input case (400).
- Mandatory test areas: RBAC and ownership isolation (teacher sections, parent children), fee calculations and partial payments, payment reversal, attendance edit window, marks locking, promotion.
- Fix failing tests by fixing the code or the test's wrong expectation. Never delete or skip a test to get a green run.

## Git

- Branch per unit: `unit-03-students`. Commit small and often with conventional messages: `feat(students): add admission endpoint`, `fix(fees): correct partial payment balance`.
- Never commit `.env`, `node_modules`, build output or secrets.

## File Organization

- `context/` — The five spec files. Source of truth.
- `src/features/<module>/` — Frontend code for one domain module.
- `src/components/` — Shared UI components used by more than one feature.
- `src/lib/` — API client, auth context, permission helpers, formatters.
- `server/src/config/` — Env validation and database connection.
- `server/src/middleware/` — Auth, RBAC, validation, rate limit, error handler.
- `server/src/modules/<module>/` — `*.routes.js`, `*.controller.js`, `*.service.js`, `*.model.js`, `*.schema.js`.
- `server/src/utils/` — Small shared helpers.
- `server/src/constants/` — Roles, permissions, enums.
- `server/src/seed/` — Dev-only seed scripts.
- `server/tests/` — API and service tests.

Naming: files are `kebab-case` (`fee-voucher.service.js`), React components are `PascalCase`, Mongoose models are singular `PascalCase` (`Student`) with plural collection names, functions and variables are `camelCase`, constants are `UPPER_SNAKE_CASE`.
