# Staff workspace

The bilingual administrative home is `/en/staff` or `/fr/staff`. It is the
post-login destination for editor, registrar, department-head, admin and
super-admin accounts. The persistent desktop sidebar and mobile drawer expose
only areas the current role can use. Existing staff pages remain unchanged
behind that shared navigation shell.

The overview uses live API data, not placeholder figures: submitted admissions,
new contact enquiries, active student enrollment, program/course catalogue,
news and events. Registrars and administrators also see transcript requests
awaiting review and current application
status counts and active students by program. A failed source displays an
unavailable value and a retry control; it is never interpreted as zero. The
queue and quick actions navigate to existing workflows.

Editors and administrators see publication counts for news and events split by
draft, scheduled, and published state. The role-protected
`GET /api/v1/cms/editor-summary` endpoint counts all non-deleted records,
including archived records in the total metric but excluding them from active
publication cards. Shortcuts also lead directly to the media library, homepage
banners, gallery, and leadership directory.

The refreshed command centre puts actionable queues above reference metrics,
then shows status distribution, top enrolled programs, and recent submitted
applications. Counts are role-scoped and show a last-refreshed time. The
sidebar can be filtered by name; Ctrl/Cmd+K focuses its search, including on
mobile. All labels and navigation remain available in English and French.

Administratively created staff accounts must replace their initial password
before the sidebar or staff pages become available. The API enforces the same
boundary and rotates the session when the password changes.

Current limitations: the dashboard is an operational overview, not a historical
analytics warehouse. Status bars are current counts rather than a cohort
conversion funnel. Finance, HR, library and LMS navigation will be added when
those modules have usable role-authorized pages and APIs. Comprehensive
end-to-end and visual testing is deferred by the current user instruction. The
production Docker image builds successfully and the English/French home,
staff, and schools entry routes returned 200 in a healthy container during the
October 2026 smoke check; this is not a substitute for authenticated workflow
testing.

## Lecturers and scheduling additions

The sidebar has a **Lecturers** entry (`/staff/lecturers`) for accountant,
finance director, admin and department-head roles. It lists lecturers, creates
them from lecturer-role users, assigns department heads (admins), and manages
teaching contracts through draft, lines, activation, closing and voiding, in
English and French. Payout details are hidden from department heads. The
accountant, finance director and discipline master roles are now admitted to
`/staff`. The scheduling page gained classroom, non-teaching-day and timetable
readiness panels, and the meeting form requires a classroom and a CM/TD/TP
type. Students see **My timetable** on their course page. Lecturer sign-in and
payroll are not built yet; see the backend `docs/HR_LECTURERS.md`.
