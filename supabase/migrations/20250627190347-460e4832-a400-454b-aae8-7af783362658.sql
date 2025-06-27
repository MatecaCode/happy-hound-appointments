
-- Populate shower availability for the next 90 days using the existing function
SELECT public.ensure_shower_availability(
  CURRENT_DATE, 
  (CURRENT_DATE + interval '90 days')::date
);

-- Verify the generation worked by checking the records
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT date) as distinct_dates,
  MIN(date) as start_date,
  MAX(date) as end_date,
  MIN(available_spots) as min_spots,
  MAX(available_spots) as max_spots
FROM public.shower_availability
WHERE date >= CURRENT_DATE;
