
-- Update the existing availability generation functions to work with staff_profiles instead of legacy provider system

-- Drop the old trigger on provider_profiles if it exists
DROP TRIGGER IF EXISTS on_provider_profile_created ON public.provider_profiles_legacy;
DROP TRIGGER IF EXISTS auto_generate_provider_availability ON public.provider_profiles_legacy;

-- Create enhanced function to ensure staff availability for a specific staff member (120 days)
CREATE OR REPLACE FUNCTION public.ensure_staff_availability(staff_profile_id uuid, start_date date, end_date date)
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
  
  RAISE NOTICE 'Generating staff availability for staff % from % to % (% days)', 
    staff_profile_id, start_date, end_date, total_days;
  
  -- Use a simple loop to ensure all days are processed
  current_date := start_date;
  WHILE current_date <= end_date LOOP
    -- Skip Sundays (dow = 0)
    IF EXTRACT(dow FROM current_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.staff_availability (staff_profile_id, date, time_slot, available)
        VALUES (staff_profile_id, current_date, slot_time, true)
        ON CONFLICT (staff_profile_id, date, time_slot) DO NOTHING;
        slots_created := slots_created + 1;
      END LOOP;
      days_processed := days_processed + 1;
    END IF;
    current_date := current_date + interval '1 day';
  END LOOP;
  
  RAISE NOTICE 'Completed staff availability generation: % days processed, % slots created for staff %', 
    days_processed, slots_created, staff_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced trigger function for new staff profiles
CREATE OR REPLACE FUNCTION public.handle_new_staff_profile()
RETURNS trigger AS $$
DECLARE
  target_end_date date;
BEGIN
  target_end_date := (CURRENT_DATE + interval '120 days')::date;
  
  RAISE NOTICE 'New staff profile created: ID=%, can_groom=%, can_vet=%, can_bathe=%, generating availability until %', 
    NEW.id, NEW.can_groom, NEW.can_vet, NEW.can_bathe, target_end_date;
  
  -- Generate 120 days of availability for new staff members
  -- All staff get availability regardless of their specific capabilities
  -- The booking system will filter based on service requirements and staff capabilities
  PERFORM public.ensure_staff_availability(
    NEW.id, 
    CURRENT_DATE, 
    target_end_date
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to fire after insert on staff_profiles
DROP TRIGGER IF EXISTS on_staff_profile_created ON public.staff_profiles;
CREATE TRIGGER on_staff_profile_created
  AFTER INSERT ON public.staff_profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_staff_profile();

-- Enhanced daily rolling function for staff availability
CREATE OR REPLACE FUNCTION public.roll_daily_staff_availability()
RETURNS void AS $$
DECLARE
  target_date date;
  staff_record record;
  staff_count integer := 0;
BEGIN
  -- Calculate target date (today + 120 days)
  target_date := (CURRENT_DATE + interval '120 days')::date;
  
  RAISE NOTICE 'Rolling daily staff availability: adding date %', target_date;
  
  -- Add staff availability for all active staff
  FOR staff_record IN 
    SELECT id FROM public.staff_profiles WHERE active = true
  LOOP
    PERFORM public.ensure_staff_availability(
      staff_record.id, 
      target_date, 
      target_date
    );
    staff_count := staff_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Daily roll complete: extended availability for % staff to %', 
    staff_count, target_date;
  
  -- Clean up old availability (older than today)
  DELETE FROM public.staff_availability WHERE date < CURRENT_DATE;
  
  RAISE NOTICE 'Cleaned up old staff availability records before %', CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Update handle_new_user function to work with staff_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    user_role text;
    user_name text;
    new_staff_id uuid;
    target_end_date date;
BEGIN
    -- Get role and name from user metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário');
    target_end_date := (CURRENT_DATE + interval '120 days')::date;
    
    RAISE NOTICE 'Processing new user: ID=%, role=%, name=%', NEW.id, user_role, user_name;
    
    -- Insert role into user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create profile entries for backwards compatibility and new system
    IF user_role = 'client' THEN
        INSERT INTO public.clients (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Client profile created for user %', NEW.id;
        
    ELSIF user_role = 'staff' THEN
        -- Get staff capabilities from user metadata
        DECLARE
            can_groom_val boolean := COALESCE((NEW.raw_user_meta_data->>'can_groom')::boolean, false);
            can_vet_val boolean := COALESCE((NEW.raw_user_meta_data->>'can_vet')::boolean, false);
            can_bathe_val boolean := COALESCE((NEW.raw_user_meta_data->>'can_bathe')::boolean, false);
            location_id_val uuid := COALESCE((NEW.raw_user_meta_data->>'location_id')::uuid, NULL);
        BEGIN
            -- Create staff profile with capabilities
            INSERT INTO public.staff_profiles (
                user_id, name, can_groom, can_vet, can_bathe, location_id, active
            )
            VALUES (NEW.id, user_name, can_groom_val, can_vet_val, can_bathe_val, location_id_val, true)
            ON CONFLICT (user_id) DO NOTHING
            RETURNING id INTO new_staff_id;
            
            -- If we didn't get a staff_id (conflict), try to get existing one
            IF new_staff_id IS NULL THEN
                SELECT id INTO new_staff_id
                FROM public.staff_profiles
                WHERE user_id = NEW.id;
            END IF;
            
            RAISE NOTICE 'Staff profile created: ID=%, can_groom=%, can_vet=%, can_bathe=%, location=%', 
                new_staff_id, can_groom_val, can_vet_val, can_bathe_val, location_id_val;
            
            -- Generate availability if staff exists and doesn't have availability yet
            IF new_staff_id IS NOT NULL THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.staff_availability
                    WHERE staff_profile_id = new_staff_id
                    LIMIT 1
                ) THEN
                    RAISE NOTICE 'Generating availability for staff %', new_staff_id;
                    PERFORM public.ensure_staff_availability(
                        new_staff_id,
                        CURRENT_DATE,
                        target_end_date
                    );
                ELSE
                    RAISE NOTICE 'Availability already exists for staff %', new_staff_id;
                END IF;
            ELSE
                RAISE WARNING 'Could not create/find staff profile for user %', NEW.id;
            END IF;
        END;
        
    ELSIF user_role = 'admin' THEN
        -- Create admin role entry only
        RAISE NOTICE 'Admin profile created for user %', NEW.id;
        
    -- Legacy compatibility for old groomer/vet registrations
    ELSIF user_role = 'groomer' THEN
        -- Create legacy groomer record
        INSERT INTO public.groomers_legacy (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Also create staff profile with grooming capability
        INSERT INTO public.staff_profiles (
            user_id, name, can_groom, can_vet, can_bathe, active
        )
        VALUES (NEW.id, user_name, true, false, true, true)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Legacy groomer converted to staff profile for user %', NEW.id;
        
    ELSIF user_role = 'vet' THEN
        -- Create legacy vet record
        INSERT INTO public.veterinarians_legacy (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Also create staff profile with vet capability
        INSERT INTO public.staff_profiles (
            user_id, name, can_groom, can_vet, can_bathe, active
        )
        VALUES (NEW.id, user_name, false, true, false, true)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Legacy vet converted to staff profile for user %', NEW.id;
    END IF;
    
    RAISE NOTICE 'User creation process completed successfully for %', NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in handle_new_user for user %: % %', NEW.id, SQLERRM, SQLSTATE;
END;
$$;

-- Add unique constraint to staff_availability to prevent duplicates
ALTER TABLE public.staff_availability 
DROP CONSTRAINT IF EXISTS unique_staff_availability;

ALTER TABLE public.staff_availability 
ADD CONSTRAINT unique_staff_availability 
UNIQUE (staff_profile_id, date, time_slot);

-- Test the functions to ensure they work properly for existing staff
DO $$
DECLARE
  test_start_date date := CURRENT_DATE;
  test_end_date date := (CURRENT_DATE + interval '120 days')::date;
  staff_record record;
BEGIN
  RAISE NOTICE 'Testing staff availability generation functions...';
  
  -- Test staff availability for all existing staff
  FOR staff_record IN 
    SELECT id FROM public.staff_profiles WHERE active = true
  LOOP
    -- Only generate if no availability exists
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_availability
        WHERE staff_profile_id = staff_record.id
        LIMIT 1
    ) THEN
        PERFORM public.ensure_staff_availability(
            staff_record.id, 
            test_start_date, 
            test_end_date
        );
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Staff availability generation test completed successfully';
END $$;
