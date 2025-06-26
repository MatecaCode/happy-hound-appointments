
-- Replace ensure_provider_availability function with improved debug version
CREATE OR REPLACE FUNCTION public.ensure_provider_availability(
  provider_profile_id uuid,
  start_date date,
  end_date date
)
RETURNS void AS $$
DECLARE
  loop_date date;
  slot_time time;
  total_days integer;
  days_processed integer := 0;
  slots_created integer := 0;
BEGIN
  total_days := (end_date - start_date) + 1;
  RAISE NOTICE 'Generating provider availability from % to % (% days)', start_date, end_date, total_days;

  loop_date := start_date;
  WHILE loop_date <= end_date LOOP
    -- Skip Sundays
    IF EXTRACT(dow FROM loop_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.provider_availability (provider_id, date, time_slot, available)
        VALUES (provider_profile_id, loop_date, slot_time, true)
        ON CONFLICT (provider_id, date, time_slot) DO NOTHING;
        slots_created := slots_created + 1;
      END LOOP;
      days_processed := days_processed + 1;
    END IF;

    loop_date := loop_date + interval '1 day';
  END LOOP;

  RAISE NOTICE 'Completed: % days processed, % slots created', days_processed, slots_created;
END;
$$ LANGUAGE plpgsql;
