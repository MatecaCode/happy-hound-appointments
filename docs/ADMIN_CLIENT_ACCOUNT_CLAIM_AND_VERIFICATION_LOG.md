# Admin – Client/User Profile Creation, Claim Status, Verification (Log)

Date: 2025-10-15

## Summary
- Implemented and documented the admin claim/verification status pipeline used by the Admin → Clientes page.
- Added database RPC `public.admin_get_client_claim_status(_client_ids uuid[])` used by the UI to compute per-client status.
- Ensured PostgREST caches the RPC by granting EXECUTE to both `authenticated` and `anon` (the function is SECURITY DEFINER with an admin guard).
- Removed console error PGRST202 by reloading the PostgREST schema cache.

## Concepts and Definitions
- linked: `clients.user_id IS NOT NULL`
- verified: `auth.users.email_confirmed_at IS NOT NULL` for a case-insensitive email match
- invited: `clients.claim_invited_at IS NOT NULL`
- can_invite: `NOT linked AND NOT verified`

These are the single source of truth values used to drive UI badges and the invite button visibility.

## Database RPC
SQL (current version):

```
create or replace function public.admin_get_client_claim_status(_client_ids uuid[])
returns table (
  client_id uuid,
  linked boolean,
  verified boolean,
  invited boolean,
  can_invite boolean
)
language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'not authorized';
  end if;

  return query
  with base as (
    select c.id,
           (c.user_id is not null)  as linked,
           (c.claim_invited_at is not null) as invited,
           lower(c.email) as email_lc
    from public.clients c
    where c.id = any(_client_ids)
  ),
  au as (
    select lower(u.email) as email_lc,
           bool_or(u.email_confirmed_at is not null) as verified
    from auth.users u
    group by 1
  )
  select b.id,
         b.linked,
         coalesce(a.verified,false) as verified,
         b.invited,
         case when b.linked or coalesce(a.verified,false) then false else true end as can_invite
  from base b
  left join au a on a.email_lc = b.email_lc;
end $$;

grant execute on function public.admin_get_client_claim_status(uuid[]) to authenticated, anon;
```

Security:
- SECURITY DEFINER with admin-only guard (`public.has_role(auth.uid(),'admin')`).
- Granted EXECUTE to `anon` solely so PostgREST’s db-anon-role can cache the function; the guard still blocks non-admin callers at runtime.

PostgREST cache:

```
notify pgrst, 'reload schema';
```

(If notify is blocked: Supabase → Settings → API → Reset API Cache.)

## Frontend Wiring
File: `src/pages/AdminClients.tsx`
- Fetch clients; build `ids = clients.map(c => c.id)`.
- Call RPC:

```
const { data: rows, error } = await supabase
  .rpc('admin_get_client_claim_status', { _client_ids: ids });
```

- Build `claimStatusMap[client_id] = { linked, verified, invited, can_invite }`.
- UI rules:
  - Badge “Conta Vinculada” when `linked || verified`.
  - Else “Convite Enviado” when `invited`.
  - Else “Pendente Registro”.
  - Invite button visible when `can_invite === true`; label = `invited ? 'Reenviar Convite' : 'Enviar Convite'`.
- Fallback (defensive only): if RPC fails/empty, use `linked = !!client.user_id` and `invited = !!client.claim_invited_at` for rendering to avoid false negatives.

## Edge Function (unchanged)
- `send-client-invite`: Sends claim email; UI keeps `invited=true` optimistically upon success and re-fetches RPC.

## Operational Notes
- Root cause of prior PGRST202: function executed only by `authenticated` → PostgREST (running as `anon`) didn’t cache it. Granting EXECUTE to `anon` resolved this without changing behavior (guard still enforces admin-only).
- Debounced RPC loads on the page to avoid duplicate in-flight calls.

## Verification Checklist
- Schema:
  - `select proname, proargtypes::regtype[] from pg_proc where proname='admin_get_client_claim_status';`
- Privileges:
  - `has_function_privilege('anon','public.admin_get_client_claim_status(uuid[])','EXECUTE') = true`
  - `has_function_privilege('authenticated','public.admin_get_client_claim_status(uuid[])','EXECUTE') = true`
- Smoke test:
  - `select * from public.admin_get_client_claim_status(ARRAY['00000000-0000-0000-0000-000000000000']::uuid[]);`
- UI:
  - With `?claim_ui_debug=1`, log shows `[CLAIM_RPC] ids N rows N` and one `[CLAIM_UI]` per card.

## Troubleshooting
- PGRST202 “not found in schema cache”
  - Grant EXECUTE to `anon`; reload cache.
  - Confirm exact signature: `_client_ids uuid[]`.
- Invite not sending
  - Check `send-client-invite` function logs and Supabase email provider.
- Verified user still “Pendente Registro”
  - Confirm `auth.users.email_confirmed_at` is set for the email (case-insensitive match).

## Impact
- No behavior change for end users beyond removing console errors.
- Admins can reliably see claim status, resend invites, and verify linkage state.
