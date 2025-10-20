-- Vettale Admin — Availability Atomicity Verification
-- Usage (psql):
--   psql "postgresql://..." -f scripts/test_admin_availability_verification.sql
--
-- Configure inputs here (adjust as needed)
\set staff_name 'Vet Test'
\set ymd '2025-10-20'
\set anchor1 '11:30'
\set anchor2 '13:00'

-- STEP 0 — Resolve staff_profile_id
\echo 'STEP 0 — Resolve staff_profile_id'
select id as staff_profile_id, name
from staff_profiles
where name = :staff_name;

-- STEP 1 — Sanity of minute grid for the day
\echo 'STEP 1 — Sanity of minute grid for the day'
with bounds as (
  select time '09:00' as t_start, time '17:50' as t_end
),
series as (
  select generate_series(
    (select t_start from bounds)::time,
    (select t_end from bounds)::time,
    interval '10 min'
  )::time as t
)
select
  (select count(*) from series) as expected_slots,
  (select count(*) from staff_availability
    where staff_profile_id = (select id from staff_profiles where name=:staff_name)
      and date = :ymd)::int as actual_slots;

-- STEP 2 — Verify anchor1 30-min window fully toggled
\echo 'STEP 2 — Verify anchor1 30-min window fully toggled'
with params as (
  select
    (select id from staff_profiles where name=:staff_name) as sid,
    :ymd::date as d,
    :anchor1::time as anchor
),
window as (
  select generate_series(anchor, anchor + interval '29 min', interval '10 min')::time as t
  from params
)
select
  (select array_agg(t order by t)
   from (select t from window
         except
         select time_slot from staff_availability
         where staff_profile_id = (select sid from params)
           and date = (select d from params)
           and time_slot between (select anchor from params)
                               and (select anchor from params) + time '00:29'
           and available = true) q) as missing_available,
  (select array_agg(sa.time_slot order by sa.time_slot)
   from staff_availability sa
   join params p on true
   where sa.staff_profile_id = p.sid
     and sa.date = p.d
     and sa.time_slot between p.anchor and p.anchor + time '00:29'
     and sa.available = false) as wrongly_unavailable;

-- STEP 2b — Verify anchor2 (optional)
\echo 'STEP 2b — Verify anchor2 (optional)'
with params as (
  select
    (select id from staff_profiles where name=:staff_name) as sid,
    :ymd::date as d,
    :anchor2::time as anchor
),
window as (
  select generate_series(anchor, anchor + interval '29 min', interval '10 min')::time as t
  from params
)
select
  (select array_agg(t order by t)
   from (select t from window
         except
         select time_slot from staff_availability
         where staff_profile_id = (select sid from params)
           and date = (select d from params)
           and time_slot between (select anchor from params)
                               and (select anchor from params) + time '00:29'
           and available = true) q) as missing_available,
  (select array_agg(sa.time_slot order by sa.time_slot)
   from staff_availability sa
   join params p on true
   where sa.staff_profile_id = p.sid
     and sa.date = p.d
     and sa.time_slot between p.anchor and p.anchor + time '00:29'
     and sa.available = false) as wrongly_unavailable;

-- STEP 3 — Whole-day action verification (available)
\echo 'STEP 3 — Whole-day available verification'
with bounds as (
  select time '09:00' t_start, time '17:50' t_end
),
series as (
  select generate_series((select t_start from bounds),
                         (select t_end from bounds),
                         interval '10 min')::time as t
),
params as (
  select (select id from staff_profiles where name=:staff_name) sid, :ymd::date d
)
select
  (select count(*) from series) as expected_available,
  (select count(*) from staff_availability sa
   join params p on true
   where sa.staff_profile_id = p.sid
     and sa.date = p.d
     and sa.available = true) as actual_available,
  (select array_agg(s.t order by s.t)
   from series s
   left join staff_availability sa
     on sa.time_slot = s.t
    and sa.staff_profile_id = (select sid from params)
    and sa.date = (select d from params)
    and sa.available = true
   where sa.time_slot is null) as gaps;

-- STEP 3b — Whole-day action verification (unavailable)
\echo 'STEP 3b — Whole-day unavailable verification'
with bounds as (
  select time '09:00' t_start, time '17:50' t_end
),
series as (
  select generate_series((select t_start from bounds),
                         (select t_end from bounds),
                         interval '10 min')::time as t
),
params as (
  select (select id from staff_profiles where name=:staff_name) sid, :ymd::date d
)
select
  (select count(*) from series) as expected_unavailable,
  (select count(*) from staff_availability sa
   join params p on true
   where sa.staff_profile_id = p.sid
     and sa.date = p.d
     and sa.available = false) as actual_unavailable,
  (select array_agg(s.t order by s.t)
   from series s
   left join staff_availability sa
     on sa.time_slot = s.t
    and sa.staff_profile_id = (select sid from params)
    and sa.date = (select d from params)
    and sa.available = false
   where sa.time_slot is null) as gaps;

-- STEP 4 — Row-count guardrail observable (optional if log exists)
\echo 'STEP 4 — Row-count guardrail (optional)'
select exists(
  select 1 from information_schema.tables
  where table_schema='public' and table_name='availability_change_log'
) as has_log;

-- If table exists, show last 10 entries for context
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='availability_change_log') then
    raise notice 'Last 10 change log rows:';
  end if;
end $$;

-- Safe to run; returns 0 rows if table missing
select staff_profile_id, date, anchor_time, affected_rows
from availability_change_log
where staff_profile_id = (select id from staff_profiles where name=:staff_name)
  and date = :ymd
order by created_at desc
limit 10;


