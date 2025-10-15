-- Admin-only RPC to compute claim/verification/invite status for clients
-- Drives Admin → Clientes UI badges and invite button visibility

create or replace function public.admin_get_client_claim_status(
  _client_ids uuid[]
)
returns table (
  client_id uuid,
  claimed boolean,
  verified boolean,
  invited boolean,
  can_invite boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  return query
  with base as (
    select c.id,
           (c.user_id is not null or c.claimed_at is not null) as claimed,
           (c.claim_invited_at is not null) as invited,
           lower(c.email) as email_lc
    from public.clients c
    where c.id = any(_client_ids)
  ),
  au as (
    select lower(u.email) as email_lc,
           bool_or(u.email_confirmed_at is not null) as any_verified
    from auth.users u
    group by 1
  )
  select b.id as client_id,
         b.claimed,
         coalesce(a.any_verified, false) as verified,
         b.invited,
         case when b.claimed or coalesce(a.any_verified,false) then false else true end as can_invite
  from base b
  left join au a on a.email_lc = b.email_lc;
end;
$$;

revoke all on function public.admin_get_client_claim_status(uuid[]) from public;
grant execute on function public.admin_get_client_claim_status(uuid[]) to authenticated;


