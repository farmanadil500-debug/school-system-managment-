# School Management System (Apex International School)

## Overview

A web-based School Management System that runs a school's daily operations in one place: admissions and student records, staff, classes and timetables, daily attendance, fee vouchers and payments, exams and report cards, notices, and reports. It is built for a single school (up to roughly 2,000 students) with six roles: Super Admin, Admin/Principal, Teacher, Accountant, Student and Parent. Each role sees only what its job requires. It replaces paper registers and Excel sheets, which cause lost records, fee disputes and slow result preparation. Stack: React (Vite) frontend, Express.js REST API, MongoDB Atlas. "Apex International School" is the working name used in the current UI prototype.

## Assumptions

- One school (one tenant) in v1. Data still carries `schoolId` so multiple branches can be added later without a rewrite.
- Currency is PKR (whole rupees). Timezone is Asia/Karachi. UI language is English in v1.
- Scale target: about 2,000 students, 150 staff, 10 concurrent staff users at peak.
- Users are not highly technical. The UI must be simple and work on a phone.

## Goals

1. Replace paper and Excel for admissions, attendance, fees and exams, so that no core school workflow needs anything outside the system.
2. Enforce role-based access on the server for all six roles. A parent can only ever see their own children's data.
3. Make fee money traceable: every payment has a receipt number, an actor and a timestamp. Payments are never silently edited or deleted.
4. Let a teacher mark a whole class's attendance in under 30 seconds, and let the school publish report cards (PDF) for a class in under 5 minutes after marks are entered.
5. Keep list and search endpoints under 500 ms (p95) at the target scale, and pages usable on a mid-range phone over 4G.
6. Ship in small, verified increments so the project is always in a working, deployable state.

## Core User Flow

1. Super Admin signs in for the first time (seeded account), changes the password and creates Admin users.
2. Admin sets up the school: school profile, academic year and terms, classes, sections, subjects.
3. Admin adds staff (teachers, accountants) and assigns teachers to sections and subjects.
4. Admin or clerk admits students, links each to guardians and creates parent/student logins.
5. Accountant sets the fee structure per class and generates monthly fee vouchers.
6. Each school day, teachers mark attendance for their sections.
7. Accountant collects fees against vouchers and prints a receipt; dues are tracked per student.
8. Admin creates an exam, teachers enter marks, Admin publishes results, report cards become available as PDF.
9. Parents and students sign in to see attendance, fee status, timetable, notices and published results.
10. Admin reviews dashboards and reports (attendance, fee collection and defaulters, results) and exports PDF/CSV.

## Features

### Access and Administration

- Login, logout, session refresh, change and reset password
- Six roles with server-enforced permissions (see `architecture.md`)
- User management (create, deactivate, reset password, assign role)
- School profile and settings (academic year, grading scheme, fee rules, attendance edit window)
- Audit log of sensitive changes (fees, marks, attendance edits, user and role changes)

### Academic Structure

- Academic years and terms, one marked as current
- Classes (Grade 1 to Grade 10 or as configured) and sections with capacity and class teacher
- Subjects and teacher-to-section-to-subject assignments
- Weekly timetable per section with teacher clash detection

### Students and Guardians

- Admission with auto-generated admission number, profile, guardian details
- Enrollment per academic year (section and roll number), so history is kept
- Search, filter, pagination, status (active, inactive, transferred, graduated)
- Promote or repeat a whole section at year end
- CSV export

### Staff

- Staff profiles (teacher, accountant, admin, support), subjects, joining date, status
- Optional staff attendance

### Attendance

- Daily section attendance: present, absent, late, leave
- Edit window for teachers, admin override with audit entry
- Per-student, per-section and monthly reports, low-attendance list

### Fees

- Fee structure per class per academic year with line items
- Monthly voucher generation, per-student discount, late fine
- Payment collection (cash, bank, online reference), partial payments, receipt PDF
- Reversal entries for mistakes (no deletion), defaulters and collection reports

### Exams and Results

- Exams per term, subject schedule with total and passing marks
- Marks entry by subject teachers, locking and publishing
- Grades from a configurable scheme, class position, report card PDF

### Communication and Reports

- Notices targeted by role or class
- WhatsApp share links for fee reminders (manual send, no bulk automation in v1)
- Role-specific dashboards, PDF and CSV exports

## Scope

### In Scope

- Everything listed under Features for a single school
- Responsive web app (phone, tablet, laptop)
- Production deployment with backups and basic monitoring

### Out of Scope (v1)

- Online payment gateways (JazzCash, Easypaisa, cards)
- Automatic SMS or WhatsApp sending
- Payroll and salary processing
- Library, transport, hostel, inventory modules
- Native mobile apps, offline mode, biometric attendance
- Online classes or learning management
- Urdu/RTL interface (keep text translatable, do not build it yet)
- Multi-school or multi-branch management UI

## Success Criteria

1. An Admin can create an academic year, classes, sections, subjects, staff and students from the UI, and everything survives a page reload and a server restart.
2. A Teacher can sign in and see and mark attendance only for their own sections. Calling the API for another section returns 403.
3. A Parent can sign in and see only their own children. Requesting another child's ID returns 403 or 404.
4. An Accountant can generate vouchers for a month, record a partial payment, print a receipt, and the voucher shows the correct remaining balance. Payment rows cannot be edited or deleted.
5. A published exam produces a correct report card PDF for each student; marks cannot be edited by a Teacher after the exam is locked.
6. All list endpoints are paginated, and the main lists respond in under 500 ms with 2,000 students of seeded data.
7. `npm run build`, `npm run lint` and `npm test` pass on a clean checkout, and the app is deployed with a live URL.
