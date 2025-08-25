-- add column if some envs don't have it
alter table public.clients
  add column if not exists birth_date date;

-- extend RPC: add p_birth_date and persist it (optional)
create or replace function public.client_update_profile(
  p_phone                       text default null,
  p_is_whatsapp                 boolean default null,
  p_preferred_channel_code      text default null,
  p_emergency_contact_name      text default null,
  p_emergency_contact_phone     text default null,
  p_preferred_staff_profile_id  uuid default null,
  p_marketing_source_code       text default null,
  p_marketing_source_other      text default null,
  p_accessibility_notes         text default null,
  p_general_notes               text default null,
  p_birth_date                  date default null             -- 👈 NEW
) returns void
language plpgsql
security invoker
as $$
declare
  v_client_id uuid;
  v_channel text;
  v_ms_code text;
  v_pct int;
  v_missing text[];
begin
  select id into v_client_id from public.clients where user_id = auth.uid();
  if v_client_id is null then raise exception 'Client record not found for current user'; end if;

  if p_preferred_channel_code is not null and p_preferred_channel_code in ('telefone','email','none') then
    v_channel := p_preferred_channel_code;
  end if;

  if p_marketing_source_code is not null and p_marketing_source_code in ('indicacao_amigo','cliente_frequente','facebook_ig','google','trafego_local','outro') then
    v_ms_code := p_marketing_source_code;
  end if;

  update public.clients c
     set phone                       = coalesce(p_phone, c.phone),
         is_whatsapp                 = coalesce(p_is_whatsapp, c.is_whatsapp),
         preferred_channel           = coalesce(v_channel, c.preferred_channel),
         emergency_contact_name      = coalesce(p_emergency_contact_name, c.emergency_contact_name),
         emergency_contact_phone     = coalesce(p_emergency_contact_phone, c.emergency_contact_phone),
         preferred_staff_profile_id  = coalesce(p_preferred_staff_profile_id, c.preferred_staff_profile_id),
         -- first-write wins for marketing source
         marketing_source_code       = coalesce(c.marketing_source_code, v_ms_code),
         marketing_source_other      = case when c.marketing_source_code is null
                                            then coalesce(p_marketing_source_other, c.marketing_source_other)
                                            else c.marketing_source_other end,
         accessibility_notes         = coalesce(p_accessibility_notes, c.accessibility_notes),
         general_notes               = coalesce(p_general_notes, c.general_notes),
         birth_date                  = coalesce(p_birth_date, c.birth_date)    -- 👈 NEW
   where c.id = v_client_id;

  -- recompute cached score (birth_date is not part of f_client_profile_progress)
  select percent_complete, missing_fields
    into v_pct, v_missing
  from public.f_client_profile_progress(v_client_id);

  update public.clients set profile_completion_score = v_pct where id = v_client_id;
end;
$$;
