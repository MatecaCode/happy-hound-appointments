Client Booking Flow - Implementation Log (Stop-Point)
Date: 2026-01-01
Scope: Current, accurate behavior of the Client self-service booking flow. This is a factual log for handoff/troubleshooting, not a proposal.


## 1) Overview
- Channel: Client self-service booking (web, authenticated users).
- Goal: Let a client select pet + service(s) + staff + date/time, submit a booking, and immediately reserve the underlying staff availability while the appointment awaits admin approval.
- Status flow: Bookings created by clients are set to status "pending"; admins approve or reject later.
- Reservation model: Immediately upon client submission, all 10‑minute `staff_availability` slots required by the booking are set to unavailable and attributed to the new appointment. Reservations are deterministic and reversible via a DB trigger on appointment status.


## 2) End-to-End Flow (UI → Availability → RPC → DB → Success UI)
1. Basic selection (pet + service[s])
   - Source: `src/components/appointment/BasicInfoForm.tsx`
   - Secondary service (GROOM/Tosa) appears only when primary category is BATH.
2. Staff selection (per required roles)
   - Source: `src/components/appointment/StaffSelectionForm.tsx` → `RoleBasedStaffSelector.tsx` → `StaffCardSelector.tsx`
   - Staff discovery + capability split: `src/hooks/useStaffFiltering.tsx` (RPC `public.get_available_staff_public()`), maps capability to roles and returns staff_profiles.id as `Provider.id`.
3. Time selection (calendar + 10-minute slots)
   - Source: `src/components/appointment/DateTimeForm.tsx`
   - Availability aggregation/caching/debounce: `src/hooks/useAppointmentData.tsx` and `src/hooks/useStaffAvailability.tsx`
   - Slot math helpers: `src/utils/timeSlotHelpers.ts`
4. Submit booking (atomic server-side reservation)
   - Source: `src/hooks/useAppointmentForm.tsx` → calls `supabase.rpc('create_booking_client', {...})`
   - Wrapper forwards to atomic RPC; atomic inserts appointment, writes `appointment_services`/`appointment_staff`, and updates `staff_availability` rows to reserved (10‑minute increments).
5. Post-submit success view (pending)
   - Source: `src/components/BookingSuccess.tsx`
   - Reads appointment + `appointment_services` (ordered) + `appointment_staff`/`staff_profiles` to render per-service details and totals.


## 3) Data Model (key tables/columns used)
- `public.appointments`
  - `id, client_id, pet_id, service_id (primary for legacy), date, time, status, service_status, duration, total_price, notes`
- `public.appointment_services`
  - `id, appointment_id, service_id, service_order (1 primary, 2 secondary), price, duration`
- `public.appointment_staff`
  - `id, appointment_id, service_id, staff_profile_id, role ('banhista'|'tosador'|'veterinario'|...)`
- `public.staff_availability`
  - `id, staff_profile_id, date, time_slot (time), available (bool)`
  - Reservation attribution (added): `reserved_appointment_id (uuid), reserved_status ('pending'|'approved')`
- Supporting (read-side):
  - `public.staff_profiles` (capabilities: `can_bathe, can_groom, can_vet`)
  - `public.pets`, `public.services`


## 4) RPC Contracts (current)
All SQL below lives in `supabase/migrations/*.sql`.

### A. Client entrypoint (wrapper)
```
create or replace function public.create_booking_client(
    _client_user_id uuid,
    _pet_id uuid,
    _service_id uuid,
    _provider_ids uuid[],
    _booking_date date,
    _time_slot time without time zone,
    _notes text default null,
    _calculated_price numeric default null,
    _calculated_duration integer default null,
    _secondary_service_id uuid default null
) returns uuid language plpgsql security definer set search_path=public;
```
Purpose: Resolve client path and forward to the atomic function with the exact same arguments (including optional secondary). Granted to `authenticated`.

Sources:
- `supabase/migrations/20250726000000-cleanup-legacy-provider-id-and-create-client-booking.sql`
- `supabase/migrations/20251231_reservation_attribution_and_dual_service_client_v2.sql` (wrapper arg sync + grants)

### B. Atomic creator (reservation + rowcount guards)
```
create or replace function public.create_booking_atomic(
    _user_id uuid,
    _pet_id uuid,
    _service_id uuid,
    _provider_ids uuid[],
    _booking_date date,
    _time_slot time without time zone,
    _notes text default null,
    _calculated_price numeric default null,
    _calculated_duration integer default null,
    _secondary_service_id uuid default null
) returns uuid language plpgsql security definer set search_path=public;
```
Behavior:
- Insert appointment (status='pending').
- Insert `appointment_services` rows: primary (order=1) and, if provided, secondary (order=2).
- Insert `appointment_staff` rows per service with role derived from service flags.
- Reserve `staff_availability` using 10‑minute series with set-based UPDATE and row-count guards:
  - Primary staff: `[T .. T + d1)`
  - Secondary staff (if present): `[T + d1 .. T + d1 + d2)`
  - SET: `available=false, reserved_appointment_id=<id>, reserved_status='pending'`
  - WHERE includes `available = true` so we only flip open rows.
  - Guard: `updated = ceil(duration_minutes / 10)`; else raise exception.
- Guards all secondary references inside `IF _secondary_service_id IS NOT NULL`.

Sources:
- `supabase/migrations/20260101_fix_client_atomic_security_and_update_predicates.sql`
- `supabase/migrations/20260101_guard_secondary_in_atomic.sql`
- Earlier contract evolution: `20250714230813-*.sql`, `20250716134711-*.sql`

### C. Reservation release on status change
```
create or replace function public.release_reserved_availability() returns trigger
language plpgsql security definer set search_path=public;

create trigger trg_release_reserved_availability
after update of status on public.appointments
for each row execute function public.release_reserved_availability();
```
Behavior:
- pending → rejected/cancelled: release only rows where `reserved_appointment_id = NEW.id` (available=true, clear reservation fields).
- pending → approved/confirmed: keep blocked; set `reserved_status='approved'`.

Source: `supabase/migrations/20251231_reservation_attribution_and_dual_service_client_v2.sql`


## 5) Slot Reservation Behavior (Client parity with Admin)
- On submit, the client RPC immediately reserves `staff_availability` rows:
  - `available=false`
  - `reserved_appointment_id=<new appointment id>`
  - `reserved_status='pending'`
- Admin approves: slots remain blocked; reserved_status becomes `'approved'` (trigger).
- Admin rejects/cancels: trigger releases only that appointment’s rows (available=true and clears reservation attribution).


## 6) Dual-Service Rules (Banho + Tosa)
- Primary service may be any; secondary only appears when primary is BATH, and must be GROOM (Tosa).
- Two sequential windows:
  - Staff A (banhista): `[T .. T + d1)`
  - Staff B (tosador): `[T + d1 .. T + d1 + d2)`
- For one staff doing both, `_provider_ids = [same, same]` is allowed; two distinct staff is also allowed.


## 7) Recent Fixes / Incidents (facts)
1) Timezone date mismatch (off-by-one fetch)
   - Symptom: Availability fetch produced a shifted date when using `toISOString()` as date key.
   - Fix: Use local date formatting `'yyyy-MM-dd'` for availability keys (parity with Admin).
   - Sources: `src/hooks/useAppointmentData.tsx`, `src/components/appointment/DateTimeForm.tsx` (dateKey strategy).

2) Availability grid mismatch (30-min vs 10-min)
   - Symptom: Edge functions (or seed) produced 30‑minute rows, breaking 10‑minute slot math.
   - Fix: Ensure 10‑minute grid generation (Edge Functions), and backfill/seed specific dates if needed.
   - Sources: `supabase/functions/roll-availability/index.ts`, `supabase/functions/refresh-availability/index.ts`

3) RLS / direct insert noise
   - Symptom: Debug utilities performing direct REST inserts hit RLS and polluted logs.
   - Fix: Remove direct inserts; only create bookings through RPCs (SECURITY DEFINER), e.g., `create_booking_client`.
   - Source: `src/utils/debugAppointmentStatus.ts` (noise removed)

4) Missing / stale RPC definitions
   - Symptoms: `404 /rest/v1/rpc/create_booking_client`, “function create_booking_atomic(...) does not exist”.
   - Fix: Add/align migrations for both RPCs and grant execute to `authenticated`. Add `NOTIFY pgrst, 'reload schema'`.
   - Source: `supabase/migrations/20250726000000-cleanup-legacy-provider-id-and-create-client-booking.sql`

5) Reservation row-count guard failing (expected N got 0)
   - Root cause: Atomic function ran as INVOKER; RLS filtered UPDATE to zero rows.
   - Fix: Make `create_booking_atomic` SECURITY DEFINER; set `search_path=public`; include `available = TRUE` in WHERE.
   - Source: `supabase/migrations/20260101_fix_client_atomic_security_and_update_predicates.sql`

6) Single-service crash
   - Error: `record "secondary_srv" is not assigned yet`
   - Cause: Referencing `secondary_srv` outside guard when `_secondary_service_id IS NULL`.
   - Fix: Guard all secondary logic within `IF _secondary_service_id IS NOT NULL THEN ... END IF;` and set safe defaults.
   - Source: `supabase/migrations/20260101_guard_secondary_in_atomic.sql`

7) Client success summary missing secondary
   - Cause: UI didn’t read `appointment_services.service_id` and couldn’t reliably map services to staff/order.
   - Fix: Select `appointment_services (service_id, service_order, price, duration)` and map staff by service_id; render both services.
   - Source: `src/components/BookingSuccess.tsx`


## 8) Verification Checklist (current behavior)
- Single-service booking (e.g., Banho):
  - Booking succeeds; `staff_availability` rows for `[T .. T + d1)` flip to unavailable with reservation attribution.
  - Success page shows Serviço 1 with correct staff, duration, and price.
- Dual-service booking (Banho + Tosa):
  - Two `appointment_services` rows with `service_order` 1 and 2.
  - Two sequential reservations (primary then secondary) with row-count guards satisfied.
  - Success page shows two services in order with corresponding staff names.
- Conflict prevention:
  - Second booking cannot reserve the same 10‑minute rows because the UPDATE requires `available = true` and row-count guard enforces completeness.
- Status transitions:
  - Approve → reservations persist and change to `reserved_status='approved'`.
  - Reject/Cancel → only that appointment’s rows are released and reservation fields cleared.


## 9) Source Map (Where things live)
| Concern | Source | Notes |
|---|---|---|
| Client submit (payload + RPC) | `src/hooks/useAppointmentForm.tsx#handleSubmit` | Calls `create_booking_client` with `_secondary_service_id` when applicable; forwards staff_profile_id array. |
| Staff discovery | `src/hooks/useStaffFiltering.tsx#fetchStaffByRole` | RPC `public.get_available_staff_public()`; returns active staff with `staff_profile_id`. |
| Availability fetch | `src/hooks/useAppointmentData.tsx`, `src/hooks/useStaffAvailability.tsx` | 10‑min slots, debounce, cache; sequential consideration in client view. |
| Slot math | `src/utils/timeSlotHelpers.ts` | Helpers to compute/format 10‑minute series and keys. |
| Success UI | `src/components/BookingSuccess.tsx` | Reads `appointment_services (service_id, service_order, price, duration)` and `appointment_staff → staff_profiles (name)`. |
| Client wrapper RPC | `supabase/migrations/20250726000000-cleanup-legacy-provider-id-and-create-client-booking.sql` | `create_booking_client(...)` SECURITY DEFINER; relays to atomic. |
| Atomic RPC | `supabase/migrations/20260101_fix_client_atomic_security_and_update_predicates.sql`, `20260101_guard_secondary_in_atomic.sql` | `create_booking_atomic(...)` SECURITY DEFINER; set-based reservations with row-count guards; guards all secondary logic. |
| Reservation attribution columns | `supabase/migrations/20251231_reservation_attribution_and_dual_service_client_v2.sql` | Adds `reserved_appointment_id`, `reserved_status`, check + index. |
| Release trigger | `supabase/migrations/20251231_reservation_attribution_and_dual_service_client_v2.sql` | `release_reserved_availability()` + `trg_release_reserved_availability`. |
| 10‑minute grid generation | `supabase/functions/roll-availability/index.ts`, `supabase/functions/refresh-availability/index.ts` | Edge Functions generate 10‑minute availability windows per business hours. |


## 10) Troubleshooting Notes
- “expected N, got 0” during reservation:
  - Confirm `create_booking_atomic` is SECURITY DEFINER and `search_path=public`.
  - Check that `_provider_ids` are `staff_profiles.id` (not user_id).
  - Verify availability exists for `[T .. T + duration)` at 10‑minute granularity and is `available=true` before update.
- Secondary missing in success summary:
  - Confirm `appointment_services` has two rows (orders 1/2) and UI selects `service_id` to map staff correctly.
- 404 RPC or signature mismatch:
  - Re-apply migrations, `NOTIFY pgrst, 'reload schema'`, and confirm grants to `authenticated`.
- Off-by-one date:
  - Ensure fetch keys use local `yyyy-MM-dd` (not `toISOString()` without normalization).


## 11) Current Behavior Statement (Client)
- Client creates “pending” booking through `create_booking_client → create_booking_atomic`.
- Atomic function writes appointment + per-service rows + per-service staff, then reserves all needed 10‑minute slots with row‑count guards.
- Reservations are attributable (`reserved_appointment_id`, `reserved_status`), and released/marked via trigger on status changes.
- Success page displays both services (when applicable) with staff, durations, and prices in order.


