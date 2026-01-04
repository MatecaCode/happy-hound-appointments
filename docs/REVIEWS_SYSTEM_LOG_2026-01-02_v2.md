Reviews System - End-to-End Flow (UX + DB/RPC) - 2026-01-02

Scope
- Complete documentation of the “Staff Reviews” feature: data model, RPC contracts, security, admin lifecycle, client UI flows (prompts, modal, submission), and verification.
- This log supersedes quick notes and captures the latest UX refinements (accessible stars, in-card prompt strip). Booking/availability logic remains unchanged.

References
- Global invariants: docs/GLOBAL_INVARIANTS.md
- Previous shard: docs/REVIEWS_SYSTEM_LOG_2026-01-02.md (DB migrations & core RPCs)


1) High-Level Architecture
1. Admin marks service lifecycle → per-service status tracked on `appointment_services.status`. A service can be `not_started`, `in_progress`, `completed`.
2. The RPC `mark_appointment_service_status` updates a single service row AND aggregates all rows to `appointments.service_status` for UI display.
3. Client review eligibility is strictly service-level. A review can be left only when the relevant `(appointment_id, service_id)` is completed and that staff is assigned in `appointment_staff`.
4. Reviews are inserted into `appointment_staff_reviews` via `create_staff_review`. Staff ratings are summarized with the view `staff_rating_summary_v` and joined into `get_available_staff_public()` for display in staff selection.
5. Client UI fetches “reviewable tuples” via `get_reviewable_service_assignments_for_client()`, shows an in-card prompt, and opens a modal for 1–5 stars + optional comment.


2) Database Objects (Authoritative)
Tables
- appointment_services
  - Columns (relevant): `appointment_id uuid`, `service_id uuid`, `service_order int`, `status text not null default 'not_started'` (check constraint in('not_started','in_progress','completed'))
  - Uniqueness: `unique(appointment_id, service_id)` (composite key to support review FK)
- appointment_staff
  - Columns (relevant): `appointment_id`, `service_id`, `staff_profile_id`, `role text not null`
- appointments
  - Columns (relevant): `id`, `status` (lifecycle), `service_status` (aggregate of service rows; used for UI badges), `date`, `time`, `client_id`
- appointment_staff_reviews
  - Columns: `id uuid pk default gen_random_uuid()`, `appointment_id`, `service_id`, `staff_profile_id`, `client_id`, `rating smallint check 1..5`, `comment text`, `created_at timestamptz default now()`
  - Uniqueness: `(appointment_id, service_id, staff_profile_id, client_id)`
  - FK: `(appointment_id, service_id)` → `appointment_services(appointment_id, service_id)` on delete cascade

Views
- staff_rating_summary_v
  - `staff_profile_id`, `avg_rating numeric(3,2)`, `review_count int`
  - `avg_rating` is NULL when no reviews


3) RPC Contracts (SECURITY DEFINER)
- mark_appointment_service_status(_appointment_id uuid, _service_id uuid, _status text, _force boolean default false) returns void
  - Validates admin; blocks cancelled appointments.
  - Transition matrix (idempotent on same value unless `_force`): `not_started → in_progress → completed`.
  - Updates one row in `appointment_services` and aggregates all rows to `appointments.service_status` (any `in_progress` → `in_progress`; all completed → `completed`; all not_started → `not_started`; mixed completed/not_started → `in_progress`).
  - Logs `appointment_events(event_type='service_status_changed')`.

- create_staff_review(_appointment_id uuid, _service_id uuid, _staff_profile_id uuid, _rating int, _comment text default null)
  returns table (staff_profile_id uuid, avg_rating numeric, review_count int)
  - Eligibility: caller owns the appointment; `(appointment_id, service_id)` exists and `status='completed'`; `(appointment_id, service_id, staff_profile_id)` exists in `appointment_staff`.
  - Rating 1–5; comment length <= 1000.
  - Errors: `not_owner`, `service_not_completed`, `staff_not_assigned`, `comment_too_long`, `already_reviewed`.
  - Returns updated summary for that `staff_profile_id`.

- get_reviewable_service_assignments_for_client() returns table (
  appointment_id, appointment_date, appointment_time, service_id, service_name, staff_profile_id, staff_name, role
)
  - Filters: caller-owned appointments; `appointment_services.status='completed'`; excludes cancelled; not-yet-reviewed tuples only.

- get_available_staff_public() (updated)
  - Returns staff_profiles plus `avg_rating` and `review_count` via LEFT JOIN to `staff_rating_summary_v`.


4) Security & RLS
- appointment_staff_reviews: RLS enabled.
  - Revoke `insert/update/delete` from `anon` and `authenticated`.
  - Writes occur via `create_staff_review` (SECURITY DEFINER).
  - Optional policy: clients may select their own reviews for future “My reviews” page.


5) Admin Flow (Service Lifecycle)
UI entry points
- ServiceStatusDropdown (`src/components/appointments/ServiceStatusDropdown.tsx`)
- Admin list page (`src/pages/AdminAppointments.tsx`)
- Admin section handler (`src/components/admin/ServiceStatusSection.tsx`)

Behavior
1. Admin chooses `Em andamento` / `Concluído` for an appointment.
2. UI fetches service rows for the appointment and calls `mark_appointment_service_status` for each `(appointment_id, service_id)`.
3. The RPC updates `appointment_services.status` (per row) and aggregates to `appointments.service_status` (for UI status badge).
4. A `service_status_changed` row is inserted into `appointment_events` for auditability.


6) Client Flow (Reviews)
Staff ratings display (in staff selection)
- Staff discovery (`get_available_staff_public`) now includes `avg_rating` and `review_count`.
- Hook `src/hooks/useStaffFiltering.tsx` maps those fields to the client-side `Provider` type and cards render either stars + count or “Sem avaliações”.

Review prompts and CTAs (appointments list)
- File: `src/pages/Appointments.tsx`
  - Fetches reviewables via `get_reviewable_service_assignments_for_client()` on load and after each submission.
  - Groups tuples by `appointment_id` in-memory (`Map`).
  - In each appointment card:
    - Removes the old top-right chip (to avoid overflow).
    - Adds a bottom “review prompt” strip within the card:
      - Title: “Avalie nossos profissionais”
      - Subtext: if >1 pending → “X profissionais para avaliar”, else “Sua opinião ajuda a melhorar cada atendimento.”
      - Button: “Avaliar” (opens details modal / review flow)
    - The strip is contained (no absolute positioning), uses `border-t`, `pt-3`, subtle `bg-white/70`, and rounded corners to match the design.

Review modal (accessible stars + comment)
- File: `src/pages/Appointments.tsx`
  - Modal star control:
    - role="radiogroup", role="radio", keyboard support: ArrowLeft/Right/Up/Down adjust rating; Enter/Space via click.
    - Stars filled up to selection; numeric “N/5” label next to it.
  - Optional comment with live character counter (<=1000).
  - Submit calls `create_staff_review`. Errors are mapped to user-friendly PT-BR messages.
  - Success feedback: inline success (“Avaliação enviada. Obrigado!” with CheckCircle), smooth auto-close (~900ms), then refetches reviewables so CTAs and badges update immediately.


7) Source Map (Where Things Live)
- DB
  - Migrations adding status/uniques/reviews/view/RPCs (2026-01-02)
  - Triggered aggregation logic in `mark_appointment_service_status`
- RPCs
  - `public.mark_appointment_service_status`
  - `public.create_staff_review`
  - `public.get_reviewable_service_assignments_for_client`
  - `public.get_available_staff_public` (extended)
- Frontend
  - Rating summary in staff selection:
    - `src/hooks/useStaffFiltering.tsx`
    - `src/components/appointment/StaffCardSelector.tsx` (stars + count or “Sem avaliações”)
  - Appointments list & review flow:
    - `src/pages/Appointments.tsx` (grouping reviewables, in-card prompt strip, modal)
  - Admin service status updates:
    - `src/components/appointments/ServiceStatusDropdown.tsx`
    - `src/components/admin/ServiceStatusSection.tsx`
    - `src/pages/AdminAppointments.tsx`


8) Error Codes & Messages (Client)
- already_reviewed → “Você já avaliou este serviço.”
- service_not_completed → “Este serviço ainda não está concluído.”
- staff_not_assigned → “Profissional não associado a este serviço.”
- not_owner → “Somente o dono do agendamento pode avaliar.”
- comment_too_long → “Comentário excede 1000 caracteres.”


9) Manual Verification Checklist
- Admin marks service to `completed`:
  - `appointment_services.status` updates to `completed` per row
  - `appointments.service_status` aggregates accordingly
  - `appointment_events` row inserted with `service_status_changed`
- Client appointments:
  - Cards show a bottom prompt strip when there are pending reviews (X profissionais para avaliar, or the empowerment microcopy).
  - Clicking “Avaliar” opens modal; star selection is clear and keyboard-friendly.
  - Submitting a review removes only that service/staff tuple; CTAs decrement; strip disappears when no items remain.
  - Staff selection page shows updated averages/counts on refresh (or later in booking).


10) Non-Goals & Guardrails (Enforced)
- No changes to booking/availability/reservations. 10‑minute grid, atomic updates, rowcount guards, and release triggers remain intact.
- Reviews are strictly service-level (per `(appointment_id, service_id, staff_profile_id)`).
- Staff identities use `staff_profiles.id` only (never provider_id or user_id).
- UI status badges continue to use `appointments.service_status`. Review eligibility uses only service-level status via RPC; no inference from badges.


11) Known Limitations & Future Improvements
- Ratings and counts refresh in staff selection are currently eventual (next load). A small increment-on-success could be implemented client-side to reflect immediately, but must be reconciled with the authoritative view on next fetch.
- The prompt’s “Avaliar” button currently opens the details modal; a dedicated drawer listing all pending items could further streamline multi-review flows.


12) Ops/Runbook Notes
- If reviewables unexpectedly return zero rows:
  - Confirm `appointment_services.status` genuinely equals `completed` and the appointment isn’t cancelled.
  - Confirm `appointment_staff` contains the `(appointment_id, service_id, staff_profile_id)` pair.
  - Check RLS revokes on `appointment_staff_reviews` and RPC ownership; ensure `create_staff_review` and `get_reviewable_service_assignments_for_client` still execute as SECURITY DEFINER.


