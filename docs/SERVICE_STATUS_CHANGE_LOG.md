## [Admin UI] Pricing split and Availability upgrades

- Split "Serviços & Preços" into dedicated page `src/pages/AdminPricing.tsx` with route `/admin/pricing`.
- Added new sidebar dropdown group "Ajuste de Preços" with item "Serviços & Preços" linking to `/admin/pricing`.
- Removed pricing tab from `src/pages/AdminSettings.tsx` and updated back link in `src/pages/EditServicePricing.tsx` to `/admin/pricing`.
- Added safe redirect route `/admin/settings/pricing` → `AdminPricing`.

- Upgraded `src/pages/AdminAvailabilityManager.tsx`:
  - Block past dates based on America/Sao_Paulo timezone; disable prev-month navigation.
  - Display 30-minute anchors (:00, :30) while updating underlying 10-minute rows atomically per staff.
  - Green (available) / Red (unavailable) slot styling with legend.
  - Replaced center "Gerar" with per-staff whole-day toggles (available / unavailable) with toast reporting affected row count.
  - Added staff filter to narrow the right-column list (reactive, no reload).

- Removed redundant sidebar link to "Staff Availability" and redirected legacy routes to `/admin/availability`.

# Service Status Change – Design and Operational Log

Author: System
Date: 2025-10-17

## Overview

This document captures the current architecture and behavior for the service status change capability, which powers the dropdown on appointment cards and the server-side RPC that writes state transitions.

The feature introduces a normalized, forward-only 3-state service flow that is independent from (but coordinated with) the admin-facing lifecycle status.

- Service flow column: `appointments.service_status` ∈ {`not_started`,`in_progress`,`completed`}
- Lifecycle column: `appointments.status` ∈ {`pending`,`confirmed`,`cancelled`,`completed`} – unchanged semantics
- Dedicated audit event: `appointment_events.event_type = 'service_status_changed'`
- Optional notification queue row: `notification_queue.message_type = 'service_completed'` with `payload` JSON for future workers

Key invariant: Availability generation, indices, and `appointment_staff` mapping/roles remain untouched.

## Scope & Non‑Negotiables

- Do not modify set-based availability generation or indices.
- Do not change `appointment_staff` mapping or the role NOT NULL constraint.
- Lifecycle `appointments.status` is unchanged by service flow except: when `service_status` becomes `completed`, we automatically flip `appointments.status` to `completed` if (and only if) it is not already `cancelled`.
- All service status writes go through the RPC below; direct writes are not supported.

## Database Model (delta highlight)

### appointments

- Columns used by this feature:
  - `service_status text` – 3-state flow
  - `service_started_at timestamptz` – first transition to `in_progress`
  - `service_completed_at timestamptz` – first transition to `completed`
  - `status text` – lifecycle (unchanged by service flow except on completion rule described above)

### appointment_events

- Check constraint updated to allow a dedicated service event:
  - `event_type in ('created','confirmed','cancelled','rejected','completed','edited','modified','service_status_changed')`
- Index added: `ix_appointment_events_type(event_type)`
- Event rows created by RPC:
  - `event_type = 'service_status_changed'`
  - `notes` includes a machine-friendly fragment: `"[service_status: <from> -> <to>]"` and any caller note

### notification_queue

- Column added: `payload jsonb` (idempotent addition)
- Check constraint allows `service_completed` in `message_type` (kept if none existed; added if present):
  - `message_type in ('booking_created','booking_confirmed','booking_cancelled','booking_rejected','service_completed')`
- Index added: `ix_notification_queue_type(message_type)`
- Rows created only when appointment is linked to a client user (see Permissions):
  - `recipient_type = 'user'`
  - `recipient_id = clients.user_id`
  - `message_type = 'service_completed'`
  - `payload` example shown below

Example payload (for future WhatsApp worker):
```json
{
  "template": "service_completed_v1",
  "channel_candidates": ["web", "whatsapp"],
  "appointment_id": "<uuid>",
  "when": "YYYY-MM-DDTHH:mm:ss±ZZ"
}
```

## RPC Contract

Function: `public.appointment_set_service_status(p_appointment_id uuid, p_new_status text, p_note text DEFAULT NULL)`

- SECURITY DEFINER, `search_path = public, auth`
- GRANT EXECUTE: `authenticated`, `anon`
- Returns JSON:
  - `appointment_id: uuid`
  - `from: text` – previous service_status
  - `to: text` – new service_status
  - `queued_notification: boolean` – true only when a notification row was actually enqueued

### Authorization & Actor Constraints

- Caller must be either:
  - Admin (`public.has_role(auth.uid(),'admin')`), or
  - Assigned staff for the appointment (`appointment_staff.staff_profile_id` mapped to `staff_profiles.user_id = auth.uid()`).
- Otherwise: `42501 forbidden`.

### Transition Rules (forward-only)

- Allowed transitions:
  - `not_started -> in_progress`
  - `in_progress -> completed`
  - Admin fast-path: `not_started -> completed` (sets both timestamps)
- Idempotency:
  - If `new_status = current_status`, the RPC is a no-op (still logs a `service_status_changed` event once per call – see implementation note below if this is later changed).
- Illegal transitions raise: `22000` with message `illegal transition <from> -> <to>`
- Appointment not found raises: `P0002`

### Timestamp Semantics

- First `in_progress`: set `service_started_at = coalesce(service_started_at, now())`
- First `completed`: set `service_completed_at = coalesce(service_completed_at, now())`

### Lifecycle Flip on Completion

- On `p_new_status = 'completed'`:
  - If `appointments.status <> 'cancelled'`, set `appointments.status = 'completed'`.
  - Do not flip if lifecycle is `cancelled`.

### Event & Notification Behavior

- After update, always insert dedicated event:
  - `appointment_events(event_type='service_status_changed', notes='[service_status: <from> -> <to>]' + p_note)`
- On completion, enqueue notification if (and only if) appointment has a client linked to a user:
  - Determine `clients.user_id` via `appointments.client_id` → `clients.id`
  - If `user_id is null`, skip enqueue gracefully (`queued_notification=false`)
  - Otherwise enqueue with `recipient_type='user'` and include `payload` JSON.

### Errors & Known Conditions

- `PGRST202`: PostgREST schema cache did not contain the function (resolved by `notify pgrst, 'reload schema'` and verifying signature).
- `23514`: CHECK constraint violations
  - Appointment events: using unapproved `event_type` (fixed by allowing `service_status_changed`).
  - Notification queue: incorrect `recipient_type` or null `recipient_id` (fixed by targeting `'user'` and skipping when `clients.user_id` is null).

## UI Integration (current)

Component: `src/components/appointments/ServiceStatusDropdown.tsx`

- Props: `appointmentId`, `value` (service_status), `canEdit`, `isAdmin?`, `refetchAppointments?`
- Behavior:
  - Shows allowed next states based on current value and role (admins can fast‑path `not_started → completed`).
  - Confirm modal; calls `supabase.rpc('appointment_set_service_status', {...})`.
  - No optimistic updates; on success, updates local state and optionally refetches page lists.
  - Disabled when `value='completed'` or `canEdit=false`.

## Observability – SQL Quick Checks

- Verify timestamps and status flip:
```sql
select id, service_status, service_started_at, service_completed_at, status
from appointments
where id = '<appointment_id>';
```

- Latest service events for an appointment:
```sql
select created_at, event_type, notes, created_by
from appointment_events
where appointment_id = '<appointment_id>'
  and event_type = 'service_status_changed'
order by created_at desc
limit 10;
```

- Notifications enqueued (if any):
```sql
select message_type, recipient_type, recipient_id, payload, created_at
from notification_queue
where appointment_id = '<appointment_id>'
order by created_at desc
limit 10;
```

- PostgREST RPC visibility:
```sql
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='appointment_set_service_status';
```

## Test Plan (executed / regression)

- Admin path:
  - `not_started → in_progress → completed` – timestamps set, event logged each step, lifecycle flips on completion, notification queued only when a client user exists.
- Staff path:
  - Assigned staff can perform same transitions; unassigned staff is rejected (`42501`).
- Idempotency:
  - Calling with the current state returns success with no DB value changes; event still logged (note: can adjust if event duplication becomes noisy).
- Error handling:
  - Illegal transitions: `22000`.
  - Missing appointment: `P0002`.
  - Cache/visibility: `PGRST202` resolved with schema reload.
- Regression:
  - Booking creation/edit/cancel unaffected.
  - Availability and `appointment_staff` untouched.

## Backward Compatibility

- Existing flows that set `service_status` directly should be migrated to call the RPC to preserve timestamps, events, and notifications.
- No triggers introduced; correctness depends on routing writes through the RPC.

## Future Extensions (non-breaking)

- WhatsApp Worker
  - Consume `notification_queue` rows with `message_type='service_completed'` and `payload.template='service_completed_v1'`.
- Analytics
  - Derive SLA and throughput from `service_started_at` and `service_completed_at` deltas.
- Realtime
  - Subscribe to `appointment_events` filtered by `event_type='service_status_changed'` to live‑refresh current lists.

## Change Log (high level)

- Added `service_started_at`, `service_completed_at` to `appointments` (idempotent).
- Dedicated event type `service_status_changed` allowed in `appointment_events`.
- Added `payload jsonb` to `notification_queue`; allowed `service_completed` message type.
- Implemented RPC `appointment_set_service_status` with:
  - Forward-only transitions, admin fast-path
  - Timestamp semantics
  - Dedicated event logging
  - Lifecycle flip on completion (unless cancelled)
  - Notification enqueue with `recipient_type='user'` only when `clients.user_id` exists
  - Return JSON includes `queued_notification` flag
