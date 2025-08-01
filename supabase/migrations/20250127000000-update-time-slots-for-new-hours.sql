-- Update generate_time_slots function to support different hours for weekdays vs Saturdays
-- Weekdays: 09:00 - 16:00 (last slot at 16:00)
-- Saturdays: 09:00 - 12:00 (last slot at 12:00)
-- Keep 10-minute intervals for admin control

CREATE OR REPLACE FUNCTION public.generate_time_slots(_date date DEFAULT NULL)
RETURNS TABLE(time_slot time without time zone)
LANGUAGE plpgsql
AS $function$
DECLARE
  is_saturday boolean;
  max_intervals integer;
BEGIN
  -- Determine if the date is a Saturday (dow = 6)
  IF _date IS NULL THEN
    -- Default to weekday if no date provided
    is_saturday := false;
  ELSE
    is_saturday := (EXTRACT(dow FROM _date) = 6);
  END IF;

  -- Set max intervals based on day type
  IF is_saturday THEN
    max_intervals := 18; -- 3 hours * 6 intervals per hour = 18 (09:00 to 12:00)
  ELSE
    max_intervals := 42; -- 7 hours * 6 intervals per hour = 42 (09:00 to 16:00)
  END IF;

  RETURN QUERY
  WITH time_series AS (
    SELECT ('09:00:00'::time + (interval '10 minutes' * generate_series(0, max_intervals))) AS slot_time
  )
  SELECT slot_time::time
  FROM time_series;
END;
$function$;

-- Create a helper function to generate time slots for a specific date
CREATE OR REPLACE FUNCTION public.generate_time_slots_for_date(_date date)
RETURNS TABLE(time_slot time without time zone)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM public.generate_time_slots(_date);
END;
$function$;

-- Update ensure_staff_availability to use the new function
CREATE OR REPLACE FUNCTION public.ensure_staff_availability(p_staff_profile_id uuid, start_date date, end_date date)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  curr_date date;
  slot_time time;
  slots_created integer := 0;
BEGIN
  RAISE NOTICE 'Generating staff availability for staff % from % to %',
    p_staff_profile_id, start_date, end_date;

  curr_date := start_date;
  WHILE curr_date <= end_date LOOP
    -- Skip Sundays (dow = 0)
    IF EXTRACT(dow FROM curr_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots(curr_date) LOOP
        INSERT INTO public.staff_availability (staff_profile_id, date, time_slot, available)
        VALUES (p_staff_profile_id, curr_date, slot_time, true)
        ON CONFLICT (staff_profile_id, date, time_slot) DO NOTHING;

        IF FOUND THEN
          slots_created := slots_created + 1;
        END IF;
      END LOOP;
    END IF;
    curr_date := curr_date + interval '1 day';
  END LOOP;

  RAISE NOTICE 'Created % availability slots for staff %', slots_created, p_staff_profile_id;
END;
$function$;

-- Update ensure_shower_availability to use the new function
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
      -- Generate time slots for this date using the updated function
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots(loop_date) LOOP
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