
-- Fix the availability generation to ensure 90 full days are created for both provider and shower availability
-- This addresses the issue where only today's availability was being generated

-- Enhanced function to ensure provider availability for a specific provider (90 full days)
CREATE OR REPLACE FUNCTION public.ensure_provider_availability(provider_profile_id uuid, start_date date, end_date date)
RETURNS void AS $$
DECLARE
  current_date date;
  slot_time time;
  total_days integer;
  days_processed integer := 0;
  slots_created integer := 0;
BEGIN
  -- Calculate total days to process
  total_days := (end_date - start_date) + 1;
  
  RAISE NOTICE 'Generating provider availability for provider % from % to % (% days)', 
    provider_profile_id, start_date, end_date, total_days;
  
  -- Use a simple loop instead of generate_series to ensure all days are processed
  current_date := start_date;
  WHILE current_date <= end_date LOOP
    -- Skip Sundays (dow = 0)
    IF EXTRACT(dow FROM current_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.provider_availability (provider_id, date, time_slot, available)
        VALUES (provider_profile_id, current_date, slot_time, true)
        ON CONFLICT (provider_id, date, time_slot) DO NOTHING;
        slots_created := slots_created + 1;
      END LOOP;
      days_processed := days_processed + 1;
    END IF;
    current_date := current_date + interval '1 day';
  END LOOP;
  
  RAISE NOTICE 'Completed provider availability generation: % days processed, % slots created for provider %', 
    days_processed, slots_created, provider_profile_id;
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
  slots_created integer := 0;
BEGIN
  -- Calculate total days to process
  total_days := (end_date - start_date) + 1;
  
  RAISE NOTICE 'Generating shower availability from % to % (% days)', 
    start_date, end_date, total_days;
  
  -- Use a simple loop instead of generate_series to ensure all days are processed
  current_date := start_date;
  WHILE current_date <= end_date LOOP
    -- Skip Sundays (dow = 0)
    IF EXTRACT(dow FROM current_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.shower_availability (date, time_slot, available_spots)
        VALUES (current_date, slot_time, 5)
        ON CONFLICT (date, time_slot) DO NOTHING;
        slots_created := slots_created + 1;
      END LOOP;
      days_processed := days_processed + 1;
    END IF;
    current_date := current_date + interval '1 day';
  END LOOP;
  
  RAISE NOTICE 'Completed shower availability generation: % days processed, % slots created', 
    days_processed, slots_created;
END;
$$ LANGUAGE plpgsql;

-- Enhanced trigger function for new provider profiles with comprehensive availability generation
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
  
  -- Ensure shower availability exists for the full 90-day period (for all provider types)
  -- This ensures shower availability is always maintained regardless of provider type
  RAISE NOTICE 'Ensuring shower availability exists for full 90-day period';
  PERFORM public.ensure_shower_availability(
    CURRENT_DATE, 
    target_end_date
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enhanced handle_new_user function with better availability generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    user_role text;
    user_name text;
    new_provider_id uuid;
    target_end_date date;
BEGIN
    -- Get role and name from user metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário');
    target_end_date := (CURRENT_DATE + interval '90 days')::date;
    
    RAISE NOTICE 'Processing new user: ID=%, role=%, name=%, target_end_date=%', 
      NEW.id, user_role, user_name, target_end_date;
    
    -- Insert role into user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'User role inserted successfully for user %', NEW.id;
    
    -- Create profile entries for backwards compatibility
    IF user_role = 'client' THEN
        INSERT INTO public.clients (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Client profile created for user %', NEW.id;
        
    ELSIF user_role = 'groomer' THEN
        -- Insert groomer record
        INSERT INTO public.groomers (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Groomer profile created for user %', NEW.id;
        
        -- Create provider profile for groomer
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'groomer', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
        
        RAISE NOTICE 'Provider profile created for groomer %', NEW.id;
        
        -- Get the provider_id
        SELECT pp.id INTO new_provider_id
        FROM public.provider_profiles pp
        WHERE pp.user_id = NEW.id AND pp.type = 'groomer';
        
        RAISE NOTICE 'Retrieved provider_id % for groomer %', new_provider_id, NEW.id;
        
        -- Generate availability if provider exists
        IF new_provider_id IS NOT NULL THEN
            RAISE NOTICE 'Generating 90 days of availability for groomer provider %', new_provider_id;
            
            -- Generate provider availability
            PERFORM public.ensure_provider_availability(
                new_provider_id,
                CURRENT_DATE,
                target_end_date
            );
            
            -- Generate shower availability for the full period
            PERFORM public.ensure_shower_availability(
                CURRENT_DATE,
                target_end_date
            );
            
            RAISE NOTICE 'Availability generation completed for provider %', new_provider_id;
        ELSE
            RAISE WARNING 'Could not retrieve provider_id for groomer %', NEW.id;
        END IF;
        
    ELSIF user_role = 'vet' THEN
        -- Insert veterinarian record
        INSERT INTO public.veterinarians (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Veterinarian profile created for user %', NEW.id;
        
        -- Create provider profile for vet
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'vet', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
        
        RAISE NOTICE 'Provider profile created for vet %', NEW.id;
        
        -- Get the provider_id
        SELECT pp.id INTO new_provider_id
        FROM public.provider_profiles pp
        WHERE pp.user_id = NEW.id AND pp.type = 'vet';
        
        RAISE NOTICE 'Retrieved provider_id % for vet %', new_provider_id, NEW.id;
        
        -- Generate availability if provider exists
        IF new_provider_id IS NOT NULL THEN
            RAISE NOTICE 'Generating 90 days of availability for vet provider %', new_provider_id;
            
            -- Generate provider availability
            PERFORM public.ensure_provider_availability(
                new_provider_id,
                CURRENT_DATE,
                target_end_date
            );
            
            RAISE NOTICE 'Availability generation completed for provider %', new_provider_id;
        ELSE
            RAISE WARNING 'Could not retrieve provider_id for vet %', NEW.id;
        END IF;
    END IF;
    
    RAISE NOTICE 'User creation process completed successfully for %', NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in handle_new_user for user %: % %', NEW.id, SQLERRM, SQLSTATE;
END;
$$;

-- Ensure the trigger exists for provider profiles
DROP TRIGGER IF EXISTS on_provider_profile_created ON public.provider_profiles;
CREATE TRIGGER on_provider_profile_created
  AFTER INSERT ON public.provider_profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_provider_profile();

-- Test the shower availability generation for existing data
DO $$
BEGIN
  RAISE NOTICE 'Testing shower availability generation for next 90 days...';
  PERFORM public.ensure_shower_availability(
    CURRENT_DATE, 
    (CURRENT_DATE + interval '90 days')::date
  );
  RAISE NOTICE 'Shower availability test completed';
END $$;
