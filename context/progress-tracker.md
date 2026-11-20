# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 0: Foundation. A UI prototype with mock data exists. The backend and database are connected but have not been audited. No production modules are built yet.

## Current Goal

- Unit 0: audit the current repo, then put the project foundation in place (structure, config, error handling, tooling, tests) so every later unit builds on the same base.

## Completed

- React + Vite UI prototype with a sidebar layout and pages: Dashboard, Students, Teachers, Attendance, Fees, Exams & Results, Settings. All data is mock data held in React memory and resets on reload.
- Express backend scaffold exists in the repo (not yet audited against these specs).
- MongoDB Atlas free cluster created and a connection string is available.
- GitHub repository created and connected to Vercel for frontend deployment.
- Context files written: `project-overview.md`, `architecture.md`, `code-standards.md`, `ai-workflow-rules.md`, `progress-tracker.md`.

## In Progress

- None yet.

## Next Up

Each unit is finished and verified before the next one starts. Order matters because later units depend on earlier ones.

**Unit 0: Audit and foundation**
- Inspect the current repo: frontend language (JS or TS), styling system, installed packages, existing backend files. Record findings under Session Notes.
- Pre-flight security: confirm `.env` is ignored by git, create `server/.env.example`, confirm the Atlas database password has been rotated (it was shared in a chat) and Atlas Network Access is set.
- Set up `server/` structure per `architecture.md`: Zod-validated config, cached DB connection, `ApiError`, `asyncHandler`, central error handler, pino logger, helmet, CORS allow-list, rate limit, `GET /api/v1/health`.
- Add ESLint, Prettier, Vitest, supertest, mongodb-memory-server. One passing health-check test. Add a GitHub Actions workflow that runs lint, test, build.
- Done when: server starts, health endpoint reports DB connectivity, tests, lint and build pass.

**Unit 1: Auth, users and RBAC**
- `School` and `User` models, `RefreshToken`, `AuditLog` and the audit helper, seed script for the first Super Admin.
- Endpoints: login (email or phone), refresh (rotating, httpOnly cookie), logout, me, change password. Admin endpoints to create, list, update, deactivate users and reset passwords.
- Role middleware, permission constants, `can()` helper, account lockout.
- Frontend: login page, auth context, API client with refresh, `<RequireRole>`, role-aware sidebar, forced password change screen.
- Done when: each role sees only its allowed menu and the API returns 403 for forbidden calls, covered by tests.

**Unit 2: Academic structure and settings**
- Academic years and terms (one current), classes, sections, subjects, teaching assignments, school settings (grading scheme, fee rules, attendance edit window).
- Frontend: Settings and setup screens wired to the API.

**Unit 3: Students, guardians, enrollments**
- Admission (auto admission number via counters), guardians, enrollment per year, search, filter, pagination, status changes, CSV export, promotion and repeat flow, creation of parent and student logins.
- Replace the mock Students page with the real API.

**Unit 4: Staff**
- Staff profiles, linking to user accounts, teacher assignments view, optional staff attendance.
- Replace the mock Teachers page.

**Unit 5: Attendance**
- Mark a section for a date in one bulk request, edit window rule, admin override with audit, student and section reports, low-attendance list.
- Teacher can only access own sections. Parent and student see own data.

**Unit 6: Fees**
- Fee structures, monthly voucher generation (transactional, idempotent per student and month), discounts, fines, payments with receipts, partial payments, reversals, defaulters and collection reports, receipt PDF.

**Unit 7: Exams and results**
- Exams, exam subjects, marks entry, locking and publishing, grading, class position, report card PDF. Teachers limited to own subjects.

**Unit 8: Timetable**
- Weekly timetable per section, teacher clash detection, teacher and student views.

**Unit 9: Notices**
- Notices targeted by role or class, read view per role, WhatsApp share link for fee reminders.

**Unit 10: Dashboards and reports**
- Role-specific dashboards with real aggregates, CSV and PDF exports, report filters.

**Unit 11: Parent and student portals**
- Polished views: children switcher for parents, attendance, fee status and vouchers, timetable, notices, published results.

**Unit 12: Hardening and go-live**
- Load check with 2,000 seeded students, index review, security review, backup plan, error monitoring, deployment of backend and frontend, production environment variables, smoke test of every role.

## Open Questions

- Is the frontend JavaScript or TypeScript? Check in Unit 0 and record the answer.
- Backend hosting: Render (recommended) or Vercel serverless. Design supports both. Decide before Unit 12 at the latest.
- Login identifier for parents and students: many may not have an email. Default: allow login with email or phone number. Confirm.
- Fee rules: default is admin-triggered monthly voucher generation, manual per-student discounts, a flat late fine after the due date. Confirm sibling discounts and fine rules with the school.
- Grading scheme: default is percentage bands (A+ at 90 and above, A at 80, B at 70, C at 60, D at 50, F below 50). Confirm the real scheme.
- Attendance edit window for teachers: default is today plus the previous 2 days. Confirm.
- Student photos and documents upload: default is later, not in v1. Confirm.
- Notifications: default is WhatsApp share links only, no automatic sending. Confirm.
- Urdu interface: default is English only in v1. Confirm whether Urdu is needed soon.
- Backups: free Atlas M0 has no automated backups. Decide on a paid tier or scheduled exports before real data goes in.

## Architecture Decisions

- **Enrollment per academic year** (instead of a class field on the student): keeps full history, makes promotion simple, and keeps old attendance, fees and results correct after a student moves up.
- **One attendance record per student per day** with a unique index on (studentId, date): simple queries and reports, no duplicates, and bulk writes make marking a whole section fast.
- **Money as integer PKR, computed on the server**: avoids floating point errors and stops the client from tampering with totals.
- **Append-only payments with reversal entries** and an **audit log**: gives a trustworthy money trail and prevents silent edits.
- **JWT access token in memory plus rotating refresh token in an httpOnly cookie**: protects against token theft through XSS and allows session revocation. Requires an exact CORS origin allow-list because the frontend and API are on different domains.
- **Zod everywhere** (requests, env variables, client forms): one validation style across the stack.
- **Layered modules (routes, controller, service, model)**: keeps business rules testable and lets the owner learn Express one clear layer at a time.
- **`schoolId` on all business data, single school in v1**: avoids a painful migration if more branches are needed later.
- **Stateless backend with a cached DB connection**: works on Render and on Vercel serverless, so the hosting decision can be made late.
- **Soft delete for records with history**: protects reports, fees and audit trails.

## Session Notes

- The prototype UI (dev server on port 5173) shows a Students directory with 24 mock students, a sidebar with Dashboard, Students, Teachers, Attendance, Fees, Exams & Results, Settings, and a "New Admission" button. Keep this look and feel.
- The existing backend and database connection were set up quickly with AI help and are unreviewed. Treat them as a draft to align with `architecture.md`, not as finished work.
- The GitHub repository is `school-system-managment-`. The frontend deploys to Vercel with a `MONGODB_URI` environment variable already configured there.
- A database password was previously pasted into a chat. Rotate it before any real data is stored, and never put secrets in these files.
- The owner is a beginner with Express and MongoDB, and wants each step explained in simple language.
