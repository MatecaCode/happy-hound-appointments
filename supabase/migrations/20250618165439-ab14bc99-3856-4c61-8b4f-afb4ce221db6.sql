
-- Clear existing shower availability to start fresh
DELETE FROM public.shower_availability;

-- Fix the shower availability generation function
CREATE OR REPLACE FUNCTION public.ensure_shower_availability(start_date date, end_date date)
RETURNS void AS $$
DECLARE
  loop_date date;
  slot_time time;
  total_days integer;
  days_processed integer := 0;
  slots_created integer := 0;
BEGIN
  -- Calculate total days to process
  total_days := (end_date - start_date) + 1;
  
  RAISE NOTICE 'Generating shower availability from % to % (% days)', 
    start_date, end_date, total_days;
  
  -- Loop through each date in the range
  loop_date := start_date;
  WHILE loop_date <= end_date LOOP
    -- Skip Sundays (dow = 0)
    IF EXTRACT(dow FROM loop_date) != 0 THEN
      -- Generate time slots for this date using the existing generate_time_slots function
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.shower_availability (date, time_slot, available_spots)
        VALUES (loop_date, slot_time, 5)
        ON CONFLICT (date, time_slot) DO NOTHING;
        slots_created := slots_created + 1;
      END LOOP;
      days_processed := days_processed + 1;
    END IF;
    loop_date := loop_date + interval '1 day';
  END LOOP;
  
  RAISE NOTICE 'Completed shower availability generation: % days processed, % slots created', 
    days_processed, slots_created;
END;
$$ LANGUAGE plpgsql;

-- Generate 90 days of shower availability starting from today
SELECT public.ensure_shower_availability(
  CURRENT_DATE, 
  (CURRENT_DATE + interval '90 days')::date
);

-- Verify the generation worked
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT date) as distinct_dates,
  MIN(date) as start_date,
  MAX(date) as end_date
FROM public.shower_availability;
