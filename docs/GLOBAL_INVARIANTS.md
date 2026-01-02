GLOBAL INVARIANTS (Stable)

- Staff profiles only
  - Always use staff profiles; never “provider” or provider_id
  - IDs: `staff_profiles.id`, `staff_availability.staff_profile_id`, `appointment_staff.staff_profile_id`
  - `appointment_staff.role` is NOT NULL; roles include `banhista`, `tosador`, `veterinario`

- Admin booking guardrail
  - `_client_id` may be used ONLY for clients with `admin_created=true AND user_id IS NULL`
  - Otherwise use `_client_user_id`

- Availability atomicity
  - Availability grid is 10 minutes
  - Booking blocks all 10‑minute rows across `[T .. T + duration)` (or sequential for dual-service)
  - Row‑count guards must match `ceil(duration/10)`
  - Reservation attribution fields: `reserved_appointment_id`, `reserved_status`
  - Release trigger updates rows on appointment status transitions

- Naming
  - Use explicit service mapping via `appointment_services (appointment_id, service_id, service_order, price, duration, status)`
  - Dual-service invariants: primary order=1, secondary order=2


