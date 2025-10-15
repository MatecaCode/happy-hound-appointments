-- Ensure the RPC exists with the exact signature expected by the app

drop function if exists public.admin_get_client_claim_status(uuid[]);
drop function if exists public.admin_get_client_claim_status(_client_ids uuid[]);

create or replace function public.admin_get_client_claim_status(_client_ids uuid[])
returns table (
  client_id uuid,
  linked boolean,
  verified boolean,
  invited boolean,
  can_invite boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Admin-only guard (same pattern used elsewhere)
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'not authorized';
  end if;

  return query
  with base as (
    select c.id,
           (c.user_id is not null) as linked,
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
  select b.id as client_id,
         b.linked,
         coalesce(a.verified,false) as verified,
         b.invited,
         case when b.linked or coalesce(a.verified,false) then false else true end as can_invite
  from base b
  left join au a on a.email_lc = b.email_lc;
end $$;

grant execute on function public.admin_get_client_claim_status(uuid[]) to authenticated;

-- Attempt to reload PostgREST schema cache (ignored if not permitted)
do $$
begin
  perform pg_notify('pgrst','reload schema');
exception when others then
  -- ignore
  null;
end $$;


