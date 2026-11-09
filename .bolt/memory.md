# Project memory

## Product intent & audience

- School Management System MVP web app for a single school ("Apex International School").
- Primary users: school administrators/admin staff managing students, teachers, attendance, fees, and exams.
- Goal: production-ready, highly polished MVP with extreme ease of use (beginner-friendly UI).

## Brand personality & voice

- Clean, modern enterprise SaaS tone; professional and trustworthy.
- UI copy is plain, action-oriented English with clear labels.

## Visual design & UX direction

- Indigo & Slate color scheme; high-contrast readable typography.
- Rounded modern cards (`rounded-2xl`), subtle borders (`border-slate-200`), soft shadows.
- Large click targets, clear labels paired with Lucide React icons.
- Micro-interactions: hover/transition states, entrance animations on modals and toasts.
- Fully responsive: mobile hamburger menu with sliding drawer under 1024px; horizontal scroll wrappers for tables.
- Status badges color-coded consistently:
  - Present/Paid: green
  - Absent/Overdue: red
  - Late/Pending: yellow
- Charts implemented with Tailwind/SVG (no external chart library).
- Grades scale: A+, A, B, C (and F per implementation).

## Decisions, constraints & rationale

- Stack: React (functional components only), Vite, Tailwind CSS, Lucide React icons.
- State management: local in-browser React `useState` only (no Redux/backend); all data is mock/local so forms, filters, searches, and toggles work live in preview.
- Modular component structure: Sidebar, Navbar, Modals, StatCards, Tables as reusable components.
- Academic session label: "2026–2027 · Term 1".
- Currency context supports $ and PKR.
- App scaffolded, built, and verified successfully; unused imports cleaned up.
- Shared state is centralized in `App.jsx` and threaded to pages.

## Open questions & assumptions

- No backend/auth is expected for this MVP (assumption); persistence is in-memory only and resets on reload.
- Multi-school/multi-tenant support is out of scope (assumption).
- Accessibility requirements beyond responsive layout were not specified.