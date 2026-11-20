# Architecture Context

## Stack

| Layer            | Technology                                              | Role                                                          |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Frontend         | React + Vite (existing, in `src/`)                      | UI, routing, role-aware screens                               |
| Routing          | React Router                                            | Protected routes and role guards                              |
| Server state     | TanStack Query (add only if not already present)        | Fetching, caching, mutations                                  |
| Client forms     | react-hook-form + Zod                                   | Form state, client-side validation mirroring server rules     |
| Backend          | Node.js LTS + Express (ES modules), in `server/`        | REST API and all business rules                               |
| Database         | MongoDB Atlas + Mongoose                                | Persistent storage, transactions for multi-document writes    |
| Validation       | Zod                                                     | Parse and validate every request and the environment variables |
| Auth             | JWT access token + rotating refresh token, bcrypt       | Stateless authentication, password hashing (cost 12)          |
| Security         | helmet, cors allow-list, express-rate-limit, express-mongo-sanitize | HTTP hardening, brute-force protection, NoSQL injection guard |
| Logging          | pino + pino-http                                        | Structured logs, never containing secrets or passwords        |
| PDF / CSV        | pdfkit, csv-stringify                                   | Receipts, report cards, exports (streamed, not stored)        |
| Testing          | Vitest, supertest, mongodb-memory-server (replica set)  | Service and API tests                                         |
| Hosting          | Vercel (frontend), Render or Vercel serverless (backend, decision open), MongoDB Atlas | Deployment                      |
| CI               | GitHub Actions                                          | Lint, test and build on every push and pull request           |

## System Boundaries

```
Browser (React, hosted on Vercel)
   |  HTTPS + JSON, Authorization: Bearer <access JWT>
   v
Express API (server/)
   helmet -> cors -> rate-limit -> json -> auth -> rbac -> validate
   routes -> controller -> service -> model
   v
MongoDB Atlas (Mongoose; transactions for multi-document writes)
```

- `src/` — The React app. Owns screens, routing, forms and API calls. Contains no business rules and never talks to the database.
- `src/features/<module>/` — One folder per domain module: pages, components, API functions and hooks for that module only.
- `src/lib/` — Shared client code: the API client (adds token, handles refresh and errors), auth context, permission helpers, formatters.
- `server/src/config/` — Environment validation (fails fast at startup) and the cached database connection.
- `server/src/middleware/` — Authentication, role and ownership checks, request validation, rate limiting, central error handler.
- `server/src/modules/<module>/` — One folder per domain module. Each has `*.routes.js`, `*.controller.js`, `*.service.js`, `*.model.js`, `*.schema.js` (Zod). Owns everything about that domain.
- `server/src/utils/` — Small shared helpers: `ApiError`, `asyncHandler`, pagination, money, dates, sequence counters.
- `server/src/constants/` — Roles, permissions, enums (statuses, attendance values) used by both models and validation.
- `server/tests/` — API and service tests, plus seed helpers.
- `context/` — The five spec files. They are the source of truth for what to build.

Layer rules inside a module:

- Routes: wiring only (path, middleware, controller).
- Controller: reads the validated request, calls one service function, shapes the response. No business logic, no direct model access.
- Service: all business rules, ownership checks, transactions, audit entries. Never touches `req` or `res`.
- Model: schema, indexes, simple static helpers.

## Storage Model

- **MongoDB Atlas**: all business data. Never store files or binaries in it.
- **Object storage (later, if needed)**: student photos or documents. Store only the URL in MongoDB.
- **Generated documents** (receipts, report cards, CSV): created on request and streamed to the client. Not stored.

Collections (all business documents carry `schoolId`, `createdAt`, `updatedAt`):

| Collection        | Key fields                                                                                                  | Notes and indexes                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `schools`         | name, address, phone, logoUrl, settings (currency, timezone, gradingScheme, feeDueDay, lateFine, attendanceEditDays) | One document in v1                                         |
| `users`           | email (optional), phone (optional), passwordHash, role, status, staffId / guardianId / studentId, mustChangePassword, lastLoginAt | Unique email and phone (sparse). Login by email or phone |
| `refreshTokens`   | userId, tokenHash, expiresAt, revokedAt, userAgent                                                          | TTL index on `expiresAt`. Store hash only                           |
| `academicYears`   | name, startDate, endDate, isCurrent, terms[{ name, startDate, endDate }]                                    | Exactly one current per school                                      |
| `classes`         | name, order                                                                                                 | Unique (schoolId, name)                                             |
| `sections`        | classId, name, classTeacherId, capacity                                                                     | Unique (classId, name)                                              |
| `subjects`        | name, code                                                                                                  | Unique (schoolId, code)                                             |
| `teachingAssignments` | academicYearId, sectionId, subjectId, staffId                                                           | Unique (academicYearId, sectionId, subjectId)                       |
| `staff`           | employeeNo, name, staffType (teacher, accountant, admin, support), phone, qualification, joinDate, status   | Unique (schoolId, employeeNo)                                       |
| `students`        | admissionNo, name, dob, gender, guardianIds[], address, admissionDate, status, photoUrl, currentEnrollmentId | Unique (schoolId, admissionNo). Text index on name                 |
| `guardians`       | name, relation, phone, email, occupation, cnic (optional, sensitive)                                        | Index on phone                                                      |
| `enrollments`     | studentId, academicYearId, classId, sectionId, rollNo, outcome (active, promoted, repeated, left)           | Unique (studentId, academicYearId). Unique (sectionId, academicYearId, rollNo) |
| `attendance`      | academicYearId, sectionId, studentId, date (YYYY-MM-DD), status, markedBy, remarks                          | Unique (studentId, date). Index (sectionId, date)                   |
| `staffAttendance` | staffId, date, status, markedBy                                                                             | Unique (staffId, date)                                              |
| `timetableSlots`  | academicYearId, sectionId, day, period, startTime, endTime, subjectId, staffId                              | Unique (sectionId, day, period). Unique (staffId, day, period) for clash detection |
| `feeStructures`   | academicYearId, classId, items[{ name, amount, frequency }]                                                 | Unique (academicYearId, classId)                                    |
| `feeVouchers`     | voucherNo, studentId, enrollmentId, academicYearId, period (YYYY-MM), items[], discount, fine, total, paidAmount, dueDate, status (unpaid, partial, paid, cancelled) | Unique (studentId, period). Unique voucherNo |
| `feePayments`     | receiptNo, voucherId, studentId, amount, method, reference, receivedBy, receivedAt, status (posted, reversed), reversalOf | Append-only. Unique receiptNo                              |
| `exams`           | academicYearId, termName, name, classIds[], startDate, status (draft, scheduled, marking, locked, published) |                                                                   |
| `examSubjects`    | examId, classId, subjectId, date, totalMarks, passingMarks                                                  | Unique (examId, classId, subjectId)                                 |
| `marks`           | examId, subjectId, studentId, sectionId, marksObtained, isAbsent, enteredBy                                 | Unique (examId, subjectId, studentId)                               |
| `notices`         | title, body, audience { roles[], classIds[] }, publishedAt, createdBy, expiresAt                            |                                                                     |
| `auditLogs`       | actorId, actorRole, action, entityType, entityId, before, after, ip, at                                     | Append-only. Index (entityType, entityId), (actorId, at)            |
| `counters`        | key, seq                                                                                                    | Atomic `findOneAndUpdate` with `$inc` for admission, voucher, receipt numbers |

Relationship notes:

- A student's class is never stored on `students`. It lives on `enrollments`, one per academic year, so history, promotion and reports for past years stay correct. `students.currentEnrollmentId` is a convenience pointer.
- Attendance, vouchers and marks store `studentId` plus the section or enrollment of that year, so old data never changes when a student is promoted.

## Auth and Access Model

- **Login**: identifier (email or phone) plus password. Server verifies the bcrypt hash and returns a short-lived access JWT (15 minutes) in the response body and a refresh token in an `httpOnly`, `Secure`, `SameSite=None` cookie. The cookie only works if CORS is configured with an exact origin allow-list and `credentials: true`.
- **Refresh**: the refresh token is rotated on every use. Only its hash is stored. Reuse of a revoked token revokes the whole token family and forces a re-login. Logout revokes the token.
- **Access token** is kept in memory on the client, never in `localStorage`. Claims: `sub`, `role`, `schoolId`, plus the linked profile id (`staffId`, `guardianId` or `studentId`).
- **Roles**: `super_admin`, `admin`, `teacher`, `accountant`, `student`, `parent`.
- **Authorization** is checked on the server in two steps: (1) role middleware on the route, (2) ownership check in the service (for example, a teacher must be assigned to the section, a parent must be linked to the student). Hiding a button in the UI is never a security control.
- **Lockout and limits**: strict rate limit on login and refresh. Five failed logins lock the account for 15 minutes.
- **Passwords**: created accounts get `mustChangePassword = true`. Passwords and tokens never appear in logs or audit entries.

Permission matrix (C create, R read, U update, D deactivate or soft delete, "own" means restricted by ownership):

| Module                | super_admin | admin         | teacher                                  | accountant              | student        | parent              |
| --------------------- | ----------- | ------------- | ---------------------------------------- | ----------------------- | -------------- | ------------------- |
| Users and roles       | CRUD        | CRUD (not super_admin) | R self                          | R self                  | R self         | R self              |
| School and settings   | CRUD        | CRUD          | R                                        | R                       | -              | -                   |
| Academic structure    | CRUD        | CRUD          | R                                        | R                       | R own          | R own children      |
| Students and guardians| CRUD        | CRUD          | R own sections                           | R (fee-relevant fields) | R self         | R own children      |
| Staff                 | CRUD        | CRUD          | R self                                   | R self                  | -              | -                   |
| Attendance            | CRUD        | CRUD          | CRU own sections, within edit window     | -                       | R self         | R own children      |
| Timetable             | CRUD        | CRUD          | R own                                    | -                       | R own section  | R own children      |
| Fees                  | CRUD        | CRU, reports  | -                                        | CRU (no delete; reversal only) | R self  | R own children      |
| Exams and marks       | CRUD        | CRUD          | CRU own subjects until locked            | -                       | R self, published only | R own children, published only |
| Notices               | CRUD        | CRUD          | CR for own sections, R                   | R                       | R              | R                   |
| Reports               | all         | all           | own sections                             | finance reports         | -              | -                   |
| Audit log             | R           | R             | -                                        | -                       | -              | -                   |

Defaults that are configurable in settings: teacher attendance edit window is the current day plus the previous 2 days. Older edits need an Admin and create an audit entry. Admin can unlock a locked exam, and that is audited.

## Deployment and Environments

- **Environments**: local (Atlas dev cluster or local MongoDB), staging (optional), production. Each has its own database and its own secrets.
- **Frontend**: Vercel, built from the repo. `VITE_API_URL` points at the backend.
- **Backend**: must run as a stateless Node app. Render (long-running service) is the recommended host. The code also stays compatible with Vercel serverless by caching the Mongoose connection and keeping no in-memory state. The final choice is tracked in `progress-tracker.md`.
- **Environment variables** (documented in a committed `server/.env.example`, real values only in host settings and local `.env`): `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_ORIGINS` (comma-separated), `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`.
- **Database**: Atlas Network Access restricted as tightly as the host allows. Automated backups enabled before real data is entered (free M0 has no backups, so move to a paid tier or schedule exports before go-live).
- **Health**: `GET /api/v1/health` returns app status and database connectivity, with no sensitive details.

## Invariants

1. Every route except `GET /api/v1/health`, `POST /auth/login` and `POST /auth/refresh` requires a valid token. Authorization is enforced on the server, never only in the UI.
2. `schoolId`, actor identity and role always come from the verified token, never from the request body, query or URL.
3. Controllers contain no business logic. Services never touch `req` or `res`. Only services call models.
4. Money is stored as integer PKR, never floating point. Totals, balances and fines are computed on the server. The client never sends a total.
5. `feePayments` and `auditLogs` are append-only. Mistakes are corrected by a reversal entry, never by editing or deleting.
6. Records that have history (students, staff, classes, sections, academic years, exams) are never hard-deleted. They are deactivated or archived.
7. Any operation that writes more than one document (payment plus voucher update, promotion, voucher generation, publishing results) runs in a MongoDB transaction.
8. All list endpoints are paginated (default 20, maximum 100). Sort and filter fields are whitelisted.
9. All external input is validated with Zod at the boundary. Unknown fields are stripped. Mongo operators in input are rejected or sanitized.
10. Secrets exist only in environment variables, are validated at startup (the app refuses to start without them), and are never logged, committed or returned in a response.
11. The backend is stateless: no in-memory sessions, caches or counters. Sequence numbers come from the database.
12. Parents and students can access only their own records. The ownership check lives in the service, not only in the route.
13. Calendar dates used by the business (attendance date, voucher period) are stored as `YYYY-MM-DD` or `YYYY-MM` in the school timezone. Timestamps are stored in UTC.
14. Sensitive fields (CNIC, phone, address, B-Form) are never written to logs and are masked in list views.
