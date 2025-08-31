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
[LOG_UPDATE]
date: 2025-08-24
by: GPT-5 Thinking
area: Prompting Framework / Change Management
change_summary:
- Added "SILO SCOPE" rule for all Cursor prompts: focus strictly on the current problem and code surface.
- Removed cross-domain guardrails from focused prompts (e.g., no staff/availability mentions in client-only tasks).
- Introduced STOP-ON-SCOPE-DRIFT: Cursor must pause and request approval before touching out-of-scope areas.
- Standardized LOG access: Cursor must read /Context/Vettale-LOG.md; it must NOT write/update the LOG.
- Reaffirmed minimal-diff principle: no refactors outside scope; small, testable changes only.

rationale:
- Reduce assistant confusion and accidental edits by keeping each PR tightly scoped.
- Ensure the LOG remains the single source of truth while staying human-controlled.
- Prevent ripple impacts across modules (e.g., staff/availability) during client-only changes.

touch_points:
- docs: /Context/Vettale-LOG.md (process rules added)
- prompts: All future Cursor prompts should append a SILO SCOPE block
- code: no code changes in this update

tests:
- Process change only; verified by using the SILO SCOPE add-on in current “client claim invite” work.

status: staging outcome: pass

[/LOG_UPDATE]
[LOG_UPDATE]
date: 2025-08-24
by: GPT-5 Thinking
area: Auth / Clients / Claim Flow + Edge Function + Admin UI badges

change_summary:
- Implemented invite→claim flow for admin-created clients (email invite + correct linking moment).
- Replaced INSERT-based linkage with confirmation-based linkage: link client ⇢ auth.user **after** `email_confirmed_at` is set.
- Added/used `claim_invited_at` and `claimed_at` timestamps to drive UI states (not `user_id`).
- Created Edge Function `send-client-invite` using Supabase Admin API; added CORS headers for browser calls.
- Wired Admin UI to call the function on create and via a “Send/Resend Invite” action; updated card badges.
- Standardized redirect target via `CLAIM_REDIRECT` env (local vs prod).
- Finalized invite email template using Supabase magic link placeholder.

rationale:
- Supabase `inviteUserByEmail` creates an `auth.users` row immediately (unconfirmed). Our old INSERT trigger linked too early, showing “Conta vinculada” before the user confirmed. Moving linkage to the **email-confirmed** moment fixes status accuracy and prevents premature association.
- CORS headers unblock Admin UI → Edge Function calls without server-side proxies.
- Timestamps (`claim_invited_at`, `claimed_at`) give clear, auditable state transitions.

touch_points:
- code:
  - `supabase/functions/send-client-invite/index.ts` (invite + CORS + `CLAIM_REDIRECT`)
  - Admin UI (clients list/card): invoke function on create and on “send invite”; badge logic keyed to timestamps
  - Email templates (Supabase Auth → Invite User): CTA uses `{{ .ConfirmationURL }}` (or `{{ .ActionURL }}` per project setting)
- db:
  - Dropped old trigger: `trg_link_client_on_auth_signup` (INSERT on `auth.users`)
  - New function: `public.link_client_when_email_confirmed()` (SECURITY DEFINER)
  - New trigger: `trg_link_client_on_email_confirmed` (AFTER UPDATE OF `email_confirmed_at` on `auth.users`)
  - Columns (idempotent confirm): `public.clients.claim_invited_at timestamptz`, `public.clients.claimed_at timestamptz`
  - (Optional/no-op if present) `citext` for `public.clients.email`

tests:
- Create admin client (`admin_created=true`, `user_id=NULL`, email set) → Edge Function sends invite; `claim_invited_at` set; UI shows **Convite Enviado**.
- Supabase Auth shows user “Waiting for verification”; `public.clients.user_id` remains NULL.
- Click invite → confirm email → trigger runs; `public.clients.user_id` now set; `claimed_at` stamped; UI flips to **Conta Vinculada**.
- Re-send invite on the same client returns success without duplicate side effects.
- Browser preflight no longer fails (CORS headers present).
- Redirect verified:
  - local: `CLAIM_REDIRECT=http://localhost:8080/claim`
  - prod: `CLAIM_REDIRECT=https://vettale.shop/claim`

status: staging  outcome: pass
[/LOG_UPDATE]
[LOG_UPDATE]
date: 2025-08-24
by: GPT-5 Thinking
area: Prompting Framework / Cursor Memories & Rules

change_summary:
- Installed evergreen Cursor Memories to reduce prompt boilerplate.
- Kept only high-signal rules: LOG-first, SILO scope discipline, Role isolation (Client vs Staff vs Admin), Admin booking guardrail, Naming (“staff_profile_id”, never “provider”), DB-first invariants, Secrets server-side, Timezone.

rationale:
- Make prompts concise while enforcing architectural guardrails and scope isolation.

touch_points:
- docs/process: Cursor → Memories (8 short entries)
- repo prompting: future tasks use tiny “TASK + SILO” prompts; Cursor reads `/Context/Vettale-LOG.md` before coding.

tests:
- Used new memories in the current “client invite/claim” work; Cursor stayed within scope; diffs were minimal.

status: staging  outcome: pass
follow_ups:
- Add `/docs/prompting.md` with examples of SILO prompts (optional).
- Review memories quarterly; keep them short and role-separated.
[/LOG_UPDATE]
Problem: Self-registration wasn't populating clients table properlyRoot Cause: Trigger function missing admin_created and claimed_at fieldsSolution: Updated handle_unified_registration() function + cleaned up existing dataResult: ✅ Client records now immediately populated when users click "Registrar"
🔧 Key Technical Details:
•	Migration: fix_client_registration_claimed_at applied
•	Database: Updated public.handle_unified_registration() trigger
•	Data Cleanup: Fixed 5+ existing incomplete client records
•	Admin Flows: ✅ Preserved (no conflicts)
•	Timezone: ✅ America/Sao_Paulo compliance maintained
📊 Verification:
•	✅ Self-registration creates complete client records immediately
•	✅ Admin-created clients still work via separate flow
•	✅ All existing clients now have complete data
•	✅ No security or business logic compromised

[/LOG_UPDATE]

[LOG_UPDATE]
date: 2025-08-24
by: Matheus (via Cursor)
area: Client Profile 2.0 — DB, RPCs, Micro-Wizard, UX polish
change_summary:
- DB (clients): added nullable fields phone, is_whatsapp, preferred_channel, emergency_contact_name, emergency_contact_phone,
  preferred_staff_profile_id (FK), accessibility_notes, general_notes, marketing_source_code, marketing_source_other,
  profile_completion_score, first_visit_setup_at, last_nudge_dismissed_at, birth_date; index on preferred_staff_profile_id.
- DB (consents): created public.client_consents (append-only, LGPD), RLS (client read/insert own; no update/delete), helpful indexes.
- RPCs/SQL: f_client_profile_progress(); client_get_profile_progress(); client_update_profile() with
  first-write-wins for marketing_source_* + p_birth_date; client_needs_first_visit_setup(); client_log_consent();
  client_mark_first_visit_setup(); client_get_consent_snapshot().
- RLS: confirmed owner-only UPDATE on public.clients; consents policies enforced; functions SECURITY INVOKER.
- Wizard: 4-step micro-wizard (skippable) with Step 1 contact (+ required preferred_channel & marketing_source),
  Step 2 required ToS/Privacy/Reminders (consents logged), Step 3 emergency contact, Step 4 preferences + finalize (stamps first_visit_setup_at).
- Profile UI: left card read-only (email/type/registration + consent snapshot + read-only "Como nos conheceu");
  right card editable sections ("Contato" and "Preferências"); BR phone mask; constants for channels & marketing;
  progress bar driven by server; banner hides on edit and remains hidden ≥80%.
- UX polish: default to view mode; “Rascunho restaurado” only on unsaved edit restore; hide “Completude do Perfil” when 100%;
  preferred_channel persisted reliably; birth date added (optional, not counted in score).
rationale:
- Reduce signup friction; collect operationally critical data progressively; ensure LGPD-compliant consent logging;
  keep admin-centric integrity (immutable attribution) and clean UX.
touch_points:
- db: public.clients (columns, index), public.client_consents (table/indexes/policies),
  functions: f_client_profile_progress, client_get_profile_progress, client_update_profile, client_needs_first_visit_setup,
  client_log_consent, client_mark_first_visit_setup, client_get_consent_snapshot.
- ui: Profile.tsx (sections, progress, banner, consent snapshot, birth date, draft logic),
  ClientMicroWizard.tsx (steps, masking, required consents, marketing source),
  Navigation fix (remove render loop), shared constants for preferred channel & marketing.
tests:
- DB: verified columns exist; policies enforced; RPCs callable; consents append; profile score recomputes.
- UI/E2E: phone mask; wizard saves partials; Step 2 blocks until all 3 consents; “Como nos conheceu” set once & read-only;
  preferred_channel counted (no lingering “pending”); progress refreshes from server; completeness card hidden at 100%;
  draft toast only on unsaved restore; console clean (no PGRST202/404).
status: staging outcome: pass
follow_ups:
- Authorized Pickups CRUD (behind flag), quiet_hours model/enforcement, admin report of latest consents,
  birthday communications (human + pet), move constants to lookups when ready, analytics dashboards for marketing sources & wizard drop-offs.
[/LOG_UPDATE]

[LOG_UPDATE]
date: 2025-08-24
by: GPT-5 Thinking
area: Client Pets UI (PADS) / WhatsApp CTA / Typography

change_summary:
- Prepared Cursor prompt to apply the Pagonia font family consistently across client UI (incl. profile dropdown and Pets pages).
- Prepared Cursor prompt to keep the branded background on the **Add/Edit Pet** screens (no gray fallback), via a reusable background wrapper.
- Defined required fields for Pet Create/Edit: **Nome do Pet, Raça, Data de Nascimento, Porte** with client-side validation (future birth dates blocked; submit disabled when invalid).
- Delivered WhatsApp CTA fix: bypass `wa.me` and use direct links (mobile deep link or `web.whatsapp.com`/`api.whatsapp.com`) with `encodeURIComponent` to preserve the prefilled message.
- Removed Bitly preview in proposed solution (no shorteners). User decision afterward: adopt **rebrand.ly/VettaleWhats** for now.
- Proposed first-party click tracking (GA4 event + Supabase `cta_clicks` table + Edge Function); deferred by user for later.

rationale:
- Brand consistency (Pagonia) and cohesive visuals across Pets flows.
- Ensuring Pet core data exists for future booking/pricing logic.
- Prevent loss of the prefilled WhatsApp message caused by `wa.me` + intermediaries.
- User wants lightweight click tracking without building backend right now.

touch_points:
- code (planned/updated): global CSS & tailwind font mapping; Pets list + Pet form component; small `BrandBackground` wrapper; WhatsApp helper (`utils/whatsapp.ts`) and CTA buttons.
- db: none (tracking table/Edge Function proposed but not implemented).

tests:
- Verify Pagonia renders on Meus Pets, Add/Edit Pet, and profile dropdown.
- Navigate Meus Pets → Add/Edit Pet: background matches landing (no gray).
- Attempt Pet save with any required field empty or birth date in future → blocked with inline PT-BR errors.
- Fill all required fields → save succeeds.
- WhatsApp CTA on desktop opens **web.whatsapp.com** with message prefilled; on mobile opens app or falls back to `api.whatsapp.com` with message prefilled.

status: staging  outcome: pending QA (user chose rebrand.ly link; typography + PADS updates queued via Cursor prompts)

follow_ups:
- If keeping rebrand.ly, set destination to **`https://api.whatsapp.com/send?phone=5511996378518&text=<ENCODED_MSG>`** to preserve the message and avoid previews (some shorteners inject interstitials).
- When ready, implement the first-party click tracking (GA4 + Supabase `cta_clicks` + Edge Function) to replace shorteners.
- After QA passes, update status to production and mark outcome pass.
[/LOG_UPD[LOG_UPDATE]
date: 2025-08-28
by: GPT-5 Thinking
area: UI Performance & Dev Experience (PADS/Profile/Global Logging)
change_summary:
•	Dev “silent by default”: logger passa a ocultar logs por padrão; debug só por ?debug=1 ou localStorage.setItem('debug','1').
•	Logger com redação de PII (emails, tokens, campos *_id, strings longas).
•	Removida gambi de “console stubbing” no main.tsx; mantido drop: ['console','debugger'] no build.
•	Limpeza de console.* ruidosos: migrados para log.debug/error em PADS/Profile/Nav/Auth/AdminBooking.
•	Regra ESLint no-console para evitar regressão.
•	Documentado “como habilitar/limpar debug”.
•	Preparado escopo de correção mobile (ainda não aplicado):
o	/services: prevenir overflow dos cards/CTAs; grid 1-col no mobile; min-w-0 + break-words.
o	/profile: banner “Complete seu perfil” empilhando ações no mobile, com min-h estável.
rationale:
•	Reduzir travamentos nos PCs antigos da clínica (menos custo de render/layout por logs).
•	Manter capacidade de diagnóstico sob demanda, com PII protegida.
•	Deixar mapeado um ajuste simples de CLS/overflow em mobile sem tocar back-end.
touch_points:
•	code: src/utils/logger.ts, src/main.tsx, src/pages/Pets.tsx, src/pages/Profile.tsx, src/components/ClientMicroWizard.tsx, src/hooks/useAuth.tsx, src/components/Navigation.tsx, src/pages/AdminBookingPage.tsx, vite.config.ts, .eslintrc*
•	db: n/a
tests:
•	Dev local: console limpo por padrão; debug liga/desliga por URL/localStorage; navegação em PADS/Profile sem erros.
status: staging outcome: pass
follow_ups:
•	Teste presencial nos PCs antigos da clínica (abrir /profile e /services, navegar/rolar; observar travas).
•	Se OK, promover para produção.
•	Opcional (quando for conveniente): aplicar o patch mobile descrito acima e medir CLS (alvo ≤0,10).
[/LOG_UPDATE]

[LOG_UPDATE]
date: 2025-08-30
by: GPT-5 Thinking
area: Admin Clients (Profile 2.0 alignment) + Modal stability
change_summary:
- Updated Admin Create/Edit Client to support Client Profile 2.0: kept required {name, email, phone, location}; wired optional fields (is_whatsapp, preferred_channel, emergency contacts, preferred_staff_profile_id, notes, marketing, birth_date, address).
- Fixed staff lookup: removed non-existent columns (full_name/role), now select {id, name, email, phone, location_id}; load when modal opens and filter by location; added safe label + empty states.
- Resolved Radix Select crash: replaced `SelectItem value=""` placeholders with non-empty sentinels and DB null-mapping.
- Restored create flow: admin markers set on insert {admin_created=true, created_by, needs_registration=true, user_id=NULL}; create/edit now persists all fields.
- Corrected delete regression: removed boolean-vs-integer comparisons in admin delete path.
- Minor UX: WhatsApp toggle placed under phone; non-blocking toasts + minimal debug logging.

rationale:
- Admin client creation broke after Profile 2.0 schema changes; bring admin up to parity without breaking invite/claim and prevent UI hard crashes on older clinic machines.

touch_points:
- code: `AdminClients.tsx` (form, modal, staff fetch, selects, null-mapping, error handling), staff management page (added location_id support to create/edit/list to enable preferred staff), small fixes in delete helper/SQL, constants for select sentinels.
- db: no schema changes; validated columns in `public.clients`; ensured queries only target existing columns; cleaned delete logic.

tests:
- Local/Staging manual: 
  - Open “+ Novo Cliente” → modal stable (no gray screen/chunk error).
  - Staff dropdown loads; filters by location; shows fallback text when empty.
  - Create client with new email → row created with admin markers; fields persist.
  - Edit client → changes persist.
  - Delete test client → succeeds; no “boolean > integer” error.
status: staging  outcome: pass
follow_ups:
- Cosmetics pass later (labels, spacing, helper copy).
- Decide final required vs optional field set for admin create.
- Add lightweight e2e smoke for modal open, create, edit, delete.
[/LOG_UPDATE]
[LOG_UPDATE]
date: 2025-08-30
by: GPT-5 Thinking
area: Admin routing hardening + Availability UI + Pet form validation
change_summary:
- Audited all Admin links; fixed broken targets and ensured every nav item resolves (no 404s). Added a generic `AdminComingSoon` fallback page.
- Replaced `/admin/staff-availability` page with a clean “Em Breve” component that preserves `AdminLayout` so the left menu never disappears.
- Fixed Radix Select crash by removing `SelectItem value=""` placeholders; replaced with non-empty sentinels and mapped to `null` on save.
- Corrected `staff_profiles` fetch: removed non-existent columns (`full_name`, `role`), aligned to {id, name, email, phone, location_id}; added guarded fetch & empty states.
- Fixed JSX structure error in `AdminAvailabilityManager` so `AdminLayout` wraps content and page renders reliably.
- Made pet `birth_date` **required** in create/edit flows; added validation + asterisk on labels.
rationale:
- Stabilize admin navigation and forms before deeper booking work; eliminate crashes from invalid Select values and schema drift.
touch_points:
- code: `AdminLayout.tsx`, `App.tsx`, `AdminComingSoon.tsx` (new), `AdminStaffAvailability.tsx` (replaced with Coming Soon), `AdminAvailabilityManager.tsx` (JSX fix), `AdminPets.tsx` (DOB required), any Select components using placeholder items, staff fetch helper in admin screens.
- db: none (query column selection corrected to existing columns).
tests:
- Manual: All admin nav items open without 404; Staff Availability shows Coming Soon and keeps menu; creating/editing pets enforces DOB; no Select crash; console clean for staff fetch.
status: staging  outcome: pass
follow_ups:
- Cosmetic pass later (copy/spacing).
- Keep `AdminComingSoon` as the default fallback for any future, not-yet-implemented admin routes.
[/LOG_UPDATE]
[LOG_UPDATE]
date: 2025-08-31
by: GPT-5 Thinking
area: Admin Booking (Dual-Service sequencing, Availability, Calendar & Summary)

change_summary:

Locked booking architecture to order-based mapping: service_order=1 → primary, service_order=2 → secondary across appointment_services and appointment_staff.

RPC now derives authoritative durations from services.default_duration and applies sequential availability (primary from t, secondary from t + dur(primary)) on staff_availability 10-min grid with set-based updates and row-count checks.

Implemented slot search RPC for Step 3 (sequential membership): returns only valid start times for the selected primary/secondary staff+services; optional validator RPC for override reasoning.

Unified UI state to explicit keys: primaryServiceId, secondaryServiceId|null, primaryStaffId, secondaryStaffId|null, selectedDateISO (YYYY-MM-DD), selectedTimeHHMM.

Fixed PGRST202 by consolidating a single payload builder; RPC always called with a complete payload.

Fixed calendar off-by-one: removed UTC conversions; all dates stored/sent in local America/Sao_Paulo (YYYY-MM-DD). Added 2-column Step-3 layout (calendar left, slots right).

Summary (“Resumo”/success) shows staff per service by order (pre-submit from UI state; post-submit via join by service_order).

rationale:

Aligns with LOG non-negotiables: availability is atomic & per staff; updates occur over the generated minute range and are verified. Mapping by order removes ambiguity and avoids role/provider naming drift. Durations/pricing are DB-sourced, not UI-computed, preserving integrity.

touch_points:

code:

src/pages/AdminManualBooking.tsx (state model, validation, payload builder, Step-3 layout & calendar handling, summary mapping)

src/components/BookingSuccess.tsx (post-submit mapping by service_order)

src/hooks/useAdminAvailability.ts (calls slot RPC; transforms chips)

src/utils/time.ts (toHHMMSS, local ISO helpers)

db:

RPC (updated): create_admin_booking_with_dual_services(...) — sequential availability updates; row-count validation.

RPC (new): find_dual_service_slots(_date, _primary_staff_id, _primary_service_id, _secondary_staff_id, _secondary_service_id) — sequential slot finder.

RPC (new, optional): validate_dual_service_slot(...) — conflict reason on grey/red selections.

tables used unchanged: appointments, appointment_services(service_order), appointment_staff(service_order, staff_profile_id), staff_availability, services.

tests:

Dual service (Banho 60 + Tosa 30), Amanda→Rogério, start 11:00:

staff_availability: Amanda 11:00–11:50 → FALSE; Rogério 12:00–12:20 → FALSE; surrounding slots remain TRUE.

Step-3: only valid starts green; others grey/red; override dialog shows validator reason.

Summary before submit: Serviço 1 shows Amanda, Serviço 2 shows Rogério; after submit, success view matches via DB join on service_order.

Single service: only primary rows created/blocked; secondary omitted.

Calendar: click 2025-09-19 → _booking_date='2025-09-19' (no off-by-one); Step-3 layout renders calendar left / slots right on desktop.

status: staging outcome: pass



End of document.


