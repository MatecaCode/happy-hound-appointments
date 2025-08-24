Vettale — Admin Booking Enablement (Unclaimed Admin Created Clients)
Architecture & Decision Log • Date: Aug 21, 2025 • Owner: Admin Booking WG
________________________________________
0) Executive summary
We enabled admin only bookings for unclaimed, admin created clients while preserving the existing client self service flow. The server now accepts _client_id in admin RPCs only when clients.admin_created = true and clients.user_id IS NULL. Otherwise, admin flows continue to resolve the client via _client_user_id → clients.user_id.
We corrected availability to be per staff profile, added atomic, set based locks to prevent double booking, and ensured appointment_staff.role is always set. UI now branches payloads (claimed vs unclaimed). No changes to client self service.
Canonical naming: we do not use “provider id.” The system uses staff_profile_id everywhere. Frontend still sends _provider_ids for backward compatibility, which we alias internally to staff profile IDs.
________________________________________
1) Problem statement
•	Admins must be able to book for clients created in the admin UI that have not claimed their account.
•	Prior design only allowed resolving clients by user_id (claimed users). Unclaimed admin created clients lacked a supported path.
•	Availability checks were not scoped per staff and could double book under concurrency.
•	appointment_staff.role is NOT NULL and was not always set.
________________________________________
2) Investigation findings (from repo + Cursor)
Admin booking RPCs in use (SECURITY INVOKER):
•	create_booking_admin
•	create_booking_admin_override
•	create_admin_booking_with_dual_services
Callsites:
•	AdminBookingPage.tsx (dual service)
•	AdminManualBooking.tsx + adminBookingUtils.ts (single + override)
Clients table (before): had user_id, needs_registration; no admin_created / created_by.
Admin client creation flow (before): direct supabase.from('clients').insert(...) in AdminClients.tsx (no markers set besides needs_registration).
Terminology: availability/assignments use staff_profile_id; there is no provider_id in the schema.
________________________________________
3) Changes implemented
3.1 Schema markers for admin created clients
•	Migration: add columns on public.clients
o	admin_created boolean NOT NULL DEFAULT false
o	created_by uuid NULL (+ FK to auth.users(id) with ON DELETE SET NULL)
o	Indexes: (admin_created), (user_id)
•	AdminClients.tsx: ensure admin UI inserts set:
o	admin_created = true, created_by = user.id, needs_registration = true, and leave user_id = NULL until claim.
3.2 Admin booking RPCs: _client_id enablement + guardrails
Patched functions:
•	create_booking_admin
•	create_booking_admin_override
•	create_admin_booking_with_dual_services
Add parameter: _client_id uuid DEFAULT NULL (back compatible; UI unchanged initially)
Guardrails (top of each function):
•	Enforce admin: IF NOT is_admin(auth.uid()) THEN RAISE ... END IF;
•	If _client_id provided → resolve client and require:
o	clients.admin_created = true
o	clients.user_id IS NULL
o	Else RAISE Explicit _client_id allowed only for admin created, unclaimed clients.
•	Else (no _client_id) → existing _client_user_id → clients.user_id resolution.
•	Pet ownership check: pet must belong to the resolved client.
3.3 Staff scoped availability (no “provider”)
•	Alias UI param _provider_ids uuid[] → v_staff_profile_ids uuid[].
•	Validate at least one staff profile was provided.
•	Atomic, set based locking to prevent double booking:
o	Compute end_time from service duration; compute expected_minutes.
o	For each staff_profile_id, perform a single UPDATE over a generated minute span for that date/time to set available = FALSE and count affected rows.
o	If updated_count < expected_minutes and not overriding, RAISE “not fully available.”
o	If overriding, continue and track deficit for audit logging.
•	Time series safety: use timestamp anchored generate_series((_booking_date::timestamp+_time_slot), ...) and cast back to time for the join (some Pg versions reject generate_series(time, ...)).
•	Index: CREATE INDEX IF NOT EXISTS idx_staff_availability_key ON public.staff_availability (staff_profile_id, date, time_slot);
3.4 Appointment/staff role
•	appointment_staff.role is NOT NULL → always insert with role = 'assigned' (simple, consistent default). Dual service still uses the single 'assigned' role (segmented roles can be added later).
3.5 Dual service behavior
•	Keeps prior behavior: always allows override and logs admin override slots. (We can later add _override_conflicts parity if needed.)
3.6 Admin UI payload branching (Prompt 4)
•	Helper: buildAdminClientFields(client) returns either { _client_user_id } (claimed) or { _client_id } (admin created & unclaimed). If unclaimed but not admin created → block.
•	Update client fetches to include id, user_id, admin_created.
•	Apply branching in AdminBookingPage.tsx and AdminManualBooking.tsx payload builders for all admin RPC calls.
________________________________________
4) Invariants & guardrails (what must stay true)
1.	No “provider” concept. Use staff_profile_id everywhere. UI param _provider_ids is just legacy naming, aliased internally.
2.	Admin only _client_id path requires both: admin_created = true and user_id IS NULL.
3.	Pet ownership: _pet_id must belong to the resolved client_id.
4.	Self service unaffected. Client RPCs keep resolving by auth.uid().
5.	Atomic availability locks per staff using date anchored minute series updates.
6.	appointment_staff.role always set (currently 'assigned').
7.	RLS/SECURITY: admins must have the necessary privileges; functions remain SECURITY INVOKER unless we identify policy gaps.
________________________________________
5) RLS & security checklist
Confirm admins can:
•	SELECT/UPDATE public.staff_availability
•	INSERT public.appointments, public.appointment_staff, public.appointment_services, public.appointment_addons, public.admin_actions
If any gap, either:
•	add explicit admin RLS policies, or
•	convert affected RPCs to SECURITY DEFINER (with least privileged owner) and GRANT EXECUTE to admin role only. (Not done yet.)
________________________________________
6) Performance notes
•	Added index on staff_availability(staff_profile_id, date, time_slot) to speed the atomic updates.
•	Minute granularity retained (matches current system). If we adopt 10 minute slots, we can switch to 10 minute series and reduce row pressure.
________________________________________
7) Test plan (staging)
A. Concurrency (no override):
•	Two simultaneous bookings for the same staff_profile_id, same date/time window.
•	Expect: one succeeds, one fails (updated_count < expected_minutes).
B. Claimed client path:
•	Use _client_user_id, one available staff → success; availability rows flip to available = FALSE.
C. Admin created, unclaimed path:
•	Use _client_id where admin_created = true and user_id IS NULL → success; pet ownership enforced.
D. Unclaimed but NOT admin created:
•	Attempt with _client_id → fail with explicit guardrail error.
E. Pet mismatch:
•	Pet not owned by resolved client → fail with explicit error.
F. Dual service happy path:
•	Two services, staff provided, override logs created (admin_override_slots), roles inserted ('assigned').
(Optional) Add UI smoke tests to verify payload branching and error messages.
________________________________________
8) Known limitations / deferred work
•	Dual service segmentation: Currently blocks the entire span for all selected staff and uses a single 'assigned' role. Future: primary/secondary segmentation (distinct staff/time windows and roles).
•	Role validation: We infer required roles from service booleans but do not yet verify staff capabilities vs required roles. Future: enforce capability mapping.
•	Cancellation path: Ensure cancellations/free ups restore staff_availability.available = TRUE for the booked span. (Add triggers or service code if missing.)
•	NOTICE noise: Consider gating RAISE NOTICE under a debug flag post QA.
________________________________________
9) Files & artifacts touched
•	Migrations
o	add-clients-admin-markers.sql: add admin_created, created_by, FK, indexes.
o	Function replacements: create_booking_admin, create_booking_admin_override, create_admin_booking_with_dual_services (added _client_id, guardrails, atomic availability lock, role insertion, timestamp based generate_series).
o	Index: idx_staff_availability_key.
•	Frontend
o	AdminClients.tsx: insert now sets admin_created, created_by; .select() returns these fields.
o	AdminBookingPage.tsx, AdminManualBooking.tsx: added buildAdminClientFields(); client query includes admin_created; payloads use _client_id or _client_user_id accordingly.
________________________________________
10) Glossary & canonical naming
•	staff_profile_id: canonical staff identifier used in staff_profiles, staff_availability, appointment_staff.
•	_provider_ids (UI): legacy frontend param name; always pass staff profile IDs. Server aliases to v_staff_profile_ids.
•	admin created client: clients.admin_created = true, created_by = admin user id, user_id IS NULL until claim.
•	claimed client: clients.user_id IS NOT NULL.
________________________________________
11) Decision log (DID / WHY)
•	Add admin markers on clients — to distinguish admin created unclaimed accounts for safe admin booking.
•	Allow _client_id in admin RPCs — enables admin booking without a user_id while preserving structure.
•	Guardrails on _client_id — prevent misuse; maintain data integrity.
•	Per staff availability + atomic lock — eliminate double book race conditions; align with staff based scheduling.
•	Always set appointment_staff.role — satisfy NOT NULL, keep data consistent.
•	UI payload branching — deterministic routing: claimed via _client_user_id, admin created unclaimed via _client_id.
•	Timestamp anchored generate_series — portable across Postgres versions.
________________________________________
12) Ready to test checklist
•	Timestamp anchored generate_series in all three RPCs
•	Index present on staff_availability(staff_profile_id, date, time_slot)
•	Admin RLS permits required ops (or functions run under DEFINER where needed)
•	AdminClients creates clients with admin_created=true, created_by, user_id=NULL
•	UI fetch returns admin_created and branches payloads correctly
•	Staging availability seeded for bookable minutes
________________________________________
13) Next steps (post merge)
•	Add segmented dual service support (primary/secondary windows & roles).
•	Enforce staff capability vs service requirements.
•	Implement cancellation free up logic if not already present.
•	Consider _override_conflicts parity in dual service RPC.
•	Reduce NOTICE noise; add structured audit events if needed.

Canonical Snapshot:
[LOG_UPDATE]
date: 2025-08-21
by: system
area: Canonical Snapshot (Architecture & Rules)
change_summary:
- Establish Vettale-LOG as the single source of truth for design and history.
- Set timezone to America/Sao_Paulo (São Paulo, Brazil) for all dates/times.
- Confirm staff nomenclature: no “provider”; use staff profiles everywhere.
- Confirm admin booking guardrail: `_client_id` allowed only for admin-created & unclaimed clients.
- Confirm availability is atomic, per-staff, set-based UPDATE with row-count verification.
- Confirm `appointment_staff.role` must be set (NOT NULL); using 'assigned' currently.
- Confirm UI payload branching: claimed → `_client_user_id`, admin-created unclaimed → `_client_id`, unclaimed non-admin-created → blocked.
- Confirm dual-service (simple mode): allow override by default; all selected staff blocked for full duration.
- Confirm index: `staff_availability(staff_profile_id, date, time_slot)` exists/required.

rationale:
- Keep every new session aligned, reduce churn, and prevent regressions or legacy term bleed-through (e.g., “provider”).
- Make LOG the living contract; prompt stays lean and defers to LOG.

touch_points:
- docs: Vettale-LOG (this entry)
- code/db (reference only): admin RPCs, staff availability, appointment_staff inserts, UI payload branching

tests:
- Admin booking for admin-created+unclaimed client with `_client_id` succeeds; pet ownership enforced.
- Claimed client via `_client_user_id` succeeds.
- Unclaimed but not admin-created → blocked with explicit error.
- Availability is locked per staff; concurrent double-book fails without override.
- appointment_staff inserts include `role='assigned'`.

status: baseline recorded; outcome: pass
follow_ups:
- If dual-service requires segmented staff/time windows, evolve roles (`primary`/`secondary`) + per-segment availability.
- Verify RLS grants for admin across `staff_availability`, `appointments`, `appointment_staff`, `appointment_services`, `appointment_addons`, `admin_actions`; switch to SECURITY DEFINER for any gaps if needed.
[/LOG_UPDATE]

[LOG_UPDATE]
date: 2025-08-21
by: GPT-5 Thinking
area: Calendars / Admin Booking UI / Availability / UI infra
change_summary:
•	Hard-isolated calendars: created BookingCalendar (admin) and PetDobCalendar + PetDobPicker (pet); removed cross-coupling.
•	Deprecated shared wrapper src/components/ui/calendar.tsx; removed default Caption and any module-level state; stopped barrel re-exports.
•	Implemented arrow-only navigation for Admin; removed month/year dropdowns; blocked past navigation with fromMonth=today.
•	Integrated staff availability into Admin calendar via SECURITY DEFINER RPC get_staff_availability_summary(staff_ids uuid[], start date, end date) → (date, has_availability).
•	Added month-scoped fetch on (staffProfileIds, visibleMonth); built enabledDates: Set<YYYY-MM-DD> for O(1) disabling.
•	Final disabled predicate (Admin) = past date OR (selected staff AND !enabledDates.has(dateISO)) [Sunday rule retained where configured].
•	Ensured staff selection is staff_profiles.id[] only; stored as bookingData.staffProfileIds.
•	Pet DOB kept past-only (popover with typing + dropdowns); future dates blocked; fully independent styling and logic.
•	Moved all calendar styles to CSS modules: BookingCalendar.module.css, PetDobCalendar.module.css; removed global .rdp-* leakage.
•	Added temporary debug logs/tags during rollout; documented for later removal.
rationale:
•	Prevent regressions from shared UI state; enforce LOG non-negotiables (per-staff availability, staff_profile_id), and make booking UX reflect true bookability before time selection.
touch_points:
•	code:
o	Added: src/components/calendars/admin/BookingCalendar.tsx, src/components/calendars/admin/BookingCalendar.module.css
o	Added: src/components/calendars/pet/PetDobCalendar.tsx, src/components/calendars/pet/PetDobPicker.tsx, src/components/calendars/pet/PetDobCalendar.module.css
o	Modified: src/pages/AdminBookingPage.tsx (calendar usage, availability fetch, disabled predicate, month state)
o	Modified: pet forms/pages to use PetDobPicker (AdminClients/AdminPets/PetForm/Profile as applicable)
o	Deprecated: src/components/ui/calendar.tsx and any barrels re-exporting it
•	db: RPC get_staff_availability_summary (SECURITY DEFINER, read-only); no schema changes
tests:
•	Manual verification:
o	Admin: arrows work; past dates disabled; dates without overlap availability disabled; month change triggers fetch; staff change updates enabled dates.
o	Pet: future dates disabled; year/month dropdowns OK; admin changes do not affect pet UI.
status: staging outcome: pass
follow_ups:
•	Replace temporary debug logs/tags with analytics event(s) or remove in production.
•	Add ESLint ban rule to prevent importing ui/calendar from pet/admin code.
•	Prefetch availability for adjacent months to reduce arrow-click latency.
•	Extend overlap logic to the time grid (minute-level intersection for selected services).
•	Add lightweight E2E happy-path (admin: select staff → choose enabled day → pick slot → create appointment).
•	Document guardrail: _client_id only for admin-created clients (admin_created = true, user_id IS NULL); else _client_user_id.
[/LOG_UPDATE]

________________________________________

End of document.

