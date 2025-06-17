
-- Create a centralized function to generate time slots (simplified approach)
CREATE OR REPLACE FUNCTION public.generate_time_slots()
RETURNS TABLE(time_slot time) AS $$
BEGIN
  RETURN QUERY
  WITH time_series AS (
    SELECT ('09:00:00'::time + (interval '30 minutes' * generate_series(0, 15))) AS slot_time
  )
  SELECT slot_time::time 
  FROM time_series 
  WHERE slot_time < '17:00:00'::time;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure shower availability for a date range
CREATE OR REPLACE FUNCTION public.ensure_shower_availability(start_date date, end_date date)
RETURNS void AS $$
DECLARE
  current_date date;
  slot_time time;
BEGIN
  FOR current_date IN SELECT generate_series(start_date, end_date, '1 day'::interval)::date LOOP
    -- Skip Sundays
    IF EXTRACT(dow FROM current_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.shower_availability (date, time_slot, available_spots)
        VALUES (current_date, slot_time, 5)
        ON CONFLICT (date, time_slot) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure provider availability for a specific provider
CREATE OR REPLACE FUNCTION public.ensure_provider_availability(provider_profile_id uuid, start_date date, end_date date)
RETURNS void AS $$
DECLARE
  current_date date;
  slot_time time;
BEGIN
  FOR current_date IN SELECT generate_series(start_date, end_date, '1 day'::interval)::date LOOP
    -- Skip Sundays
    IF EXTRACT(dow FROM current_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.provider_availability (provider_id, date, time_slot, available)
        VALUES (provider_profile_id, current_date, slot_time, true)
        ON CONFLICT (provider_id, date, time_slot) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enhanced trigger function for new provider profiles
CREATE OR REPLACE FUNCTION public.handle_new_provider_profile()
RETURNS trigger AS $$
BEGIN
  -- Generate 90 days of availability for new providers (groomers and vets)
  PERFORM public.ensure_provider_availability(
    NEW.id, 
    CURRENT_DATE, 
    (CURRENT_DATE + interval '90 days')::date
  );
  
  -- Also ensure shower availability exists (for groomers)
  IF NEW.type = 'groomer' THEN
    PERFORM public.ensure_shower_availability(
      CURRENT_DATE, 
      (CURRENT_DATE + interval '90 days')::date
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new provider profiles
DROP TRIGGER IF EXISTS auto_generate_provider_availability ON public.provider_profiles;
CREATE TRIGGER auto_generate_provider_availability
  AFTER INSERT ON public.provider_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_provider_profile();

-- Function for daily rolling availability (to be called by cron)
CREATE OR REPLACE FUNCTION public.roll_daily_availability()
RETURNS void AS $$
DECLARE
  target_date date;
  provider_record record;
BEGIN
  -- Calculate target date (today + 90 days)
  target_date := (CURRENT_DATE + interval '90 days')::date;
  
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
  END LOOP;
  
  -- Clean up old availability (older than today)
  DELETE FROM public.provider_availability WHERE date < CURRENT_DATE;
  DELETE FROM public.shower_availability WHERE date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraints to prevent duplicates
ALTER TABLE public.provider_availability 
DROP CONSTRAINT IF EXISTS unique_provider_availability;

ALTER TABLE public.provider_availability 
ADD CONSTRAINT unique_provider_availability 
UNIQUE (provider_id, date, time_slot);

ALTER TABLE public.shower_availability 
DROP CONSTRAINT IF EXISTS unique_shower_availability;

ALTER TABLE public.shower_availability 
ADD CONSTRAINT unique_shower_availability 
UNIQUE (date, time_slot);

-- Initialize shower availability for the next 90 days if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.shower_availability LIMIT 1) THEN
    PERFORM public.ensure_shower_availability(
      CURRENT_DATE, 
      (CURRENT_DATE + interval '90 days')::date
    );
  END IF;
END $$;
