
-- Clear any existing future availability to start fresh
DELETE FROM public.shower_availability WHERE date >= CURRENT_DATE;

-- Generate shower availability for the next 90 days manually
WITH date_series AS (
  SELECT generate_series(
    CURRENT_DATE,
    CURRENT_DATE + interval '90 days',
    '1 day'::interval
  )::date as target_date
),
time_slots AS (
  SELECT ('09:00:00'::time + (interval '30 minutes' * generate_series(0, 15))) AS slot_time
),
filtered_slots AS (
  SELECT slot_time::time 
  FROM time_slots 
  WHERE slot_time < '17:00:00'::time
)
INSERT INTO public.shower_availability (date, time_slot, available_spots)
SELECT 
  ds.target_date,
  fs.slot_time,
  5 as available_spots
FROM date_series ds
CROSS JOIN filtered_slots fs
WHERE EXTRACT(dow FROM ds.target_date) != 0; -- Skip Sundays

-- Verify the generation worked
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT date) as distinct_dates,
  MIN(date) as start_date,
  MAX(date) as end_date,
  MIN(available_spots) as min_spots,
  MAX(available_spots) as max_spots
FROM public.shower_availability
WHERE date >= CURRENT_DATE;
