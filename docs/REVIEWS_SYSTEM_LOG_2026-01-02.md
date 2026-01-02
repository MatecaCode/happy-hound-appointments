Reviews System - Stop-Point Log (2026-01-02)

Summary
- Adds per-service lifecycle status on `appointment_services` and exposes a review flow per `(appointment, service, staff)` with 1–5 stars and optional comment. Ratings are summarized and shown in staff selection. Booking/availability logic remains untouched.

DB Migrations & Objects
- `appointment_services`
  - Column: `status text not null default 'not_started'`
  - Check: `status in ('not_started','in_progress','completed')`
  - Unique: `uniq_appointment_service_pair (appointment_id, service_id)`
- `appointment_staff_reviews` (new)
  - Columns: `id, appointment_id, service_id, staff_profile_id, client_id, rating (1–5), comment, created_at`
  - Unique: `(appointment_id, service_id, staff_profile_id, client_id)`
  - Composite FK: `(appointment_id, service_id)` → `appointment_services (appointment_id, service_id)` ON DELETE CASCADE
  - Indexes: `(staff_profile_id, created_at desc)`, `(appointment_id)`
- `staff_rating_summary_v` (new view)
  - Columns: `staff_profile_id, avg_rating (nullable), review_count`
- RPCs (SECURITY DEFINER)
  - `mark_appointment_service_status(_appointment_id, _service_id, _status text, _force boolean default false) returns void`
    - Idempotent; explicit transition matrix; cancelled gating; optional approval gating (commented)
  - `create_staff_review(_appointment_id, _service_id, _staff_profile_id, _rating int, _comment text default null) returns (staff_profile_id, avg_rating, review_count)`
    - Eligibility: ownership, service row present and `status='completed'`, assigned staff, rating 1–5, comment <=1000, duplicate → `already_reviewed`
  - `get_reviewable_service_assignments_for_client() returns (appointment_id, appointment_date, appointment_time, service_id, service_name, staff_profile_id, staff_name, role)`
    - Excludes cancelled appointments; optional approval gating commented
- Staff discovery RPC updated
  - `get_available_staff_public()` now returns `avg_rating`, `review_count` (no raw comments).

RLS / Grants
- `appointment_staff_reviews`:
  - RLS enabled
  - Revoke INSERT/UPDATE/DELETE from `anon` and `authenticated`
  - Optional read policy: `reviews_select_own` (clients can read their own)
  - Writes are via SECURITY DEFINER RPCs only

Frontend Changes
- `src/hooks/useStaffFiltering.tsx`: extended provider shape to include `avg_rating` and `review_count` (mapped to `rating` and `reviewCount`).
- `src/components/appointment/StaffCardSelector.tsx`: shows stars + `(N)`; fallback “Sem avaliações” when none.
- Review CTAs will be powered by `get_reviewable_service_assignments_for_client()` (next UI step).

Verification (SQL + UI)
- Preflight duplicates: `select appointment_id, service_id, count(*) from appointment_services group by 1,2 having count(*) > 1;` → 0 rows.
- Lifecycle:
  - Non-admin → `admin required`
  - Invalid transition without `_force` → `invalid_transition`
  - Cancelled appointment → `cannot_complete_cancelled`
  - Idempotent same-status update → no-op
- Reviews:
  - Not owner → `not_owner`
  - Not completed → `service_not_completed`
  - Staff not assigned → `staff_not_assigned`
  - Rating bounds / comment length enforced
  - Duplicate → `already_reviewed`
  - Success → returns updated `(avg_rating, review_count)`
- UI:
  - Staff selection shows summary; “Sem avaliações” when none
  - Review CTAs to be added using the new reviewables RPC

Stop-Point Notes
- Booking/availability logic (10-minute grid, rowcount guards, reservation attribution) is unchanged.
- Reviews are strictly service-level and staff-assignment-specific.
- See `docs/GLOBAL_INVARIANTS.md` for invariants referenced by this feature.


