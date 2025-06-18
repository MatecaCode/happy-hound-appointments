
-- First, let's fix the availability generation to ensure 90 full days are created
-- This replaces the previous functions with corrected logic

-- Enhanced function to ensure provider availability for a specific provider (90 full days)
CREATE OR REPLACE FUNCTION public.ensure_provider_availability(provider_profile_id uuid, start_date date, end_date date)
RETURNS void AS $$
DECLARE
  current_date date;
  slot_time time;
  total_days integer;
  days_processed integer := 0;
BEGIN
  -- Calculate total days to process
  total_days := (end_date - start_date) + 1;
  
  RAISE NOTICE 'Generating provider availability for provider % from % to % (% days)', 
    provider_profile_id, start_date, end_date, total_days;
  
  FOR current_date IN SELECT generate_series(start_date, end_date, '1 day'::interval)::date LOOP
    -- Skip Sundays (dow = 0)
    IF EXTRACT(dow FROM current_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.provider_availability (provider_id, date, time_slot, available)
        VALUES (provider_profile_id, current_date, slot_time, true)
        ON CONFLICT (provider_id, date, time_slot) DO NOTHING;
      END LOOP;
      days_processed := days_processed + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Completed provider availability generation: % days processed for provider %', 
    days_processed, provider_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to ensure shower availability for a date range (90 full days)
CREATE OR REPLACE FUNCTION public.ensure_shower_availability(start_date date, end_date date)
RETURNS void AS $$
DECLARE
  current_date date;
  slot_time time;
  total_days integer;
  days_processed integer := 0;
BEGIN
  -- Calculate total days to process
  total_days := (end_date - start_date) + 1;
  
  RAISE NOTICE 'Generating shower availability from % to % (% days)', 
    start_date, end_date, total_days;
  
  FOR current_date IN SELECT generate_series(start_date, end_date, '1 day'::interval)::date LOOP
    -- Skip Sundays (dow = 0)
    IF EXTRACT(dow FROM current_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.shower_availability (date, time_slot, available_spots)
        VALUES (current_date, slot_time, 5)
        ON CONFLICT (date, time_slot) DO NOTHING;
      END LOOP;
      days_processed := days_processed + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Completed shower availability generation: % days processed', days_processed;
END;
$$ LANGUAGE plpgsql;

-- Enhanced trigger function for new provider profiles with better logging
CREATE OR REPLACE FUNCTION public.handle_new_provider_profile()
RETURNS trigger AS $$
DECLARE
  target_end_date date;
BEGIN
  target_end_date := (CURRENT_DATE + interval '90 days')::date;
  
  RAISE NOTICE 'New provider profile created: ID=%, type=%, generating availability until %', 
    NEW.id, NEW.type, target_end_date;
  
  -- Generate 90 days of availability for new providers (groomers and vets)
  PERFORM public.ensure_provider_availability(
    NEW.id, 
    CURRENT_DATE, 
    target_end_date
  );
  
  -- Also ensure shower availability exists (for groomers)
  IF NEW.type = 'groomer' THEN
    RAISE NOTICE 'Provider is groomer, ensuring shower availability';
    PERFORM public.ensure_shower_availability(
      CURRENT_DATE, 
      target_end_date
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enhanced daily rolling function with better logging
CREATE OR REPLACE FUNCTION public.roll_daily_availability()
RETURNS void AS $$
DECLARE
  target_date date;
  provider_record record;
  provider_count integer := 0;
BEGIN
  -- Calculate target date (today + 90 days)
  target_date := (CURRENT_DATE + interval '90 days')::date;
  
  RAISE NOTICE 'Rolling daily availability: adding date %', target_date;
  
  -- Add shower availability for the new target date
  PERFORM public.ensure_shower_availability(target_date, target_date);
  
  -- Add provider availability for all active providers
  FOR provider_record IN 
    SELECT id FROM public.provider_profiles 
  LOOP
    PERFORM public.ensure_provider_availability(
      provider_record.id, 
      target_date, 
      target_date
    );
    provider_count := provider_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Daily roll complete: extended availability for % providers to %', 
    provider_count, target_date;
  
  -- Clean up old availability (older than today)
  DELETE FROM public.provider_availability WHERE date < CURRENT_DATE;
  DELETE FROM public.shower_availability WHERE date < CURRENT_DATE;
  
  RAISE NOTICE 'Cleaned up old availability records before %', CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Test the functions to ensure they work properly
DO $$
DECLARE
  test_start_date date := CURRENT_DATE;
  test_end_date date := (CURRENT_DATE + interval '90 days')::date;
  provider_record record;
BEGIN
  RAISE NOTICE 'Testing availability generation functions...';
  
  -- Clear existing data for clean test
  DELETE FROM public.provider_availability WHERE date >= test_start_date;
  DELETE FROM public.shower_availability WHERE date >= test_start_date;
  
  -- Test shower availability generation
  PERFORM public.ensure_shower_availability(test_start_date, test_end_date);
  
  -- Test provider availability for all existing providers
  FOR provider_record IN 
    SELECT id, type FROM public.provider_profiles 
  LOOP
    PERFORM public.ensure_provider_availability(
      provider_record.id, 
      test_start_date, 
      test_end_date
    );
  END LOOP;
  
  RAISE NOTICE 'Availability generation test completed successfully';
END $$;
