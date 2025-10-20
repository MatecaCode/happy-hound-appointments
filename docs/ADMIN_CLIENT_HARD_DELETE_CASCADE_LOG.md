### Admin Client Hard-Delete: Availability Change Log Cascade + Defensive Purge

- **Date**: 2025-10-15
- **Scope**: Database FK fix + RPC hardening for client hard-delete
- **Owner**: Admin deletion flow (delete_client_completely)

### Summary

- Fixed hard-delete failures caused by `availability_change_log.appointment_id → appointments.id` not cascading on delete.
- Added a defensive purge inside the RPC to support older DBs that might still carry the old FK definition.
- Verified that deleting a client now removes: appointments, availability change logs, pets, client row, and triggers frontend auth user removal.

### Root Cause

- The FK `availability_change_log_appointment_id_fkey` was created with `ON DELETE NO ACTION`.
- When `appointments` were deleted during client hard-delete, `availability_change_log` retained rows that referenced the now-deleted appointments, raising a FK violation.

### Changes

- **Migration**: set FK to CASCADE and add helpful index.
  - File name: `20251015_fix_acl_fk.sql`
  - Contents:

```sql
begin;

alter table public.availability_change_log
  drop constraint if exists availability_change_log_appointment_id_fkey;

alter table public.availability_change_log
  add constraint availability_change_log_appointment_id_fkey
  foreign key (appointment_id)
  references public.appointments(id)
  on delete cascade;

create index if not exists idx_acl_appointment_id
  on public.availability_change_log(appointment_id);

commit;
```

- **RPC**: `public.delete_client_completely(_client_id uuid) returns jsonb`
  - Added defensive purge before appointment deletion to make older DBs succeed regardless of FK state:

```sql
-- defensive: purge availability change logs tied to the client's appointments
delete from public.availability_change_log acl
using public.appointments a
where a.client_id = _client_id
  and acl.appointment_id = a.id;
```

### Verification

1) Confirm FK rule is CASCADE
```sql
select tc.constraint_name, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.referential_constraints rc using (constraint_name)
where tc.table_name='availability_change_log'
  and tc.constraint_name='availability_change_log_appointment_id_fkey';
-- Expect: delete_rule = CASCADE
```

2) RPC behavior (seed client with pets, appointments and ACL rows)
```sql
select * from delete_client_completely(_client_id := 'YOUR-CLIENT-ID');
-- Expect: { success: true, cleanup_summary.* populated }
```

3) No orphans remain for that client
```sql
-- availability_change_log tied via appointments
select count(*) from public.availability_change_log acl
join public.appointments a on a.id = acl.appointment_id
where a.client_id = 'YOUR-CLIENT-ID';

-- appointments / pets / client
select count(*) from public.appointments where pet_id in (select id from public.pets where client_id='YOUR-CLIENT-ID');
select count(*) from public.pets where client_id='YOUR-CLIENT-ID';
select count(*) from public.clients where id='YOUR-CLIENT-ID';
```

4) Auth user removal
- Per design, frontend invokes service-role function to remove `auth.users` after the RPC returns. Ensure Admin UI reports successful removal and logs issues if any.

### Acceptance

- Client hard-delete succeeds whether or not ACL rows exist.
- No orphan rows reference deleted appointments.
- Existing cascading tables remain untouched except via CASCADE rules.
- UI behavior unchanged; continues to call `delete_client_completely`.

### Rollback Plan

- Recreate the previous FK with `ON DELETE NO ACTION` if necessary:
```sql
begin;
alter table public.availability_change_log
  drop constraint if exists availability_change_log_appointment_id_fkey;
alter table public.availability_change_log
  add constraint availability_change_log_appointment_id_fkey
  foreign key (appointment_id)
  references public.appointments(id)
  on delete no action;
commit;
```

### Notes

- Index `idx_acl_appointment_id` is idempotent; safe to reapply.
- The defensive purge is retained for forward-compatibility and to protect any migrated or forked databases.


