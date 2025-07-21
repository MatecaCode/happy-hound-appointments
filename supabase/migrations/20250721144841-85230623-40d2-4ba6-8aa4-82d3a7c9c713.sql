-- Create the missing staff availability functions that should work with the new staff_profiles system

-- Function to ensure staff availability (adapted from ensure_provider_availability)
CREATE OR REPLACE FUNCTION public.ensure_staff_availability(staff_profile_id uuid, start_date date, end_date date)
RETURNS void AS $$
DECLARE
  current_date date;
  slot_time time;
  slots_created integer := 0;
BEGIN
  RAISE NOTICE 'Generating staff availability for staff % from % to %', 
    staff_profile_id, start_date, end_date;
  
  current_date := start_date;
  WHILE current_date <= end_date LOOP
    -- Skip Sundays (dow = 0)
    IF EXTRACT(dow FROM current_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.staff_availability (staff_profile_id, date, time_slot, available)
        VALUES (staff_profile_id, current_date, slot_time, true)
        ON CONFLICT (staff_profile_id, date, time_slot) DO NOTHING;
        
        IF FOUND THEN
          slots_created := slots_created + 1;
        END IF;
      END LOOP;
    END IF;
    current_date := current_date + interval '1 day';
  END LOOP;
  
  RAISE NOTICE 'Created % availability slots for staff %', slots_created, staff_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new staff profile creation (adapted from handle_new_provider_profile)
CREATE OR REPLACE FUNCTION public.handle_new_staff_profile()
RETURNS trigger AS $$
DECLARE
  target_end_date date;
BEGIN
  target_end_date := (CURRENT_DATE + interval '120 days')::date;
  
  RAISE NOTICE 'New staff profile created: ID=%, can_groom=%, can_vet=%, can_bathe=%, generating availability until %', 
    NEW.id, NEW.can_groom, NEW.can_vet, NEW.can_bathe, target_end_date;
  
  -- Generate 120 days of availability for new staff members
  PERFORM public.ensure_staff_availability(
    NEW.id, 
    CURRENT_DATE, 
    target_end_date
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new staff profiles
DROP TRIGGER IF EXISTS on_staff_profile_created ON public.staff_profiles;
CREATE TRIGGER on_staff_profile_created
  AFTER INSERT ON public.staff_profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_staff_profile();

-- Update handle_new_user to work with staff_profiles instead of legacy tables
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
    can_groom_val boolean;
    can_vet_val boolean;
    can_bathe_val boolean;
    default_location_id uuid;
BEGIN
    -- Get role and name from user metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário');
    
    RAISE NOTICE 'Processing new user: ID=%, role=%, name=%', NEW.id, user_role, user_name;
    
    -- Insert role into user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Get default location (first location if exists)
    SELECT id INTO default_location_id FROM public.locations WHERE active = true LIMIT 1;
    
    -- Create profile entries based on role
    IF user_role = 'client' THEN
        INSERT INTO public.clients (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Client profile created for user %', NEW.id;
        
    ELSIF user_role = 'staff' THEN
        -- Get staff capabilities from user metadata with defaults
        can_groom_val := COALESCE((NEW.raw_user_meta_data->>'can_groom')::boolean, false);
        can_vet_val := COALESCE((NEW.raw_user_meta_data->>'can_vet')::boolean, false);
        can_bathe_val := COALESCE((NEW.raw_user_meta_data->>'can_bathe')::boolean, false);
        
        -- Create staff profile with capabilities
        INSERT INTO public.staff_profiles (
            user_id, name, can_groom, can_vet, can_bathe, location_id, active
        )
        VALUES (NEW.id, user_name, can_groom_val, can_vet_val, can_bathe_val, default_location_id, true)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING id INTO new_staff_id;
        
        -- If we didn't get a staff_id (conflict), try to get existing one
        IF new_staff_id IS NULL THEN
            SELECT id INTO new_staff_id
            FROM public.staff_profiles
            WHERE user_id = NEW.id;
        END IF;
        
        RAISE NOTICE 'Staff profile created: ID=%, can_groom=%, can_vet=%, can_bathe=%', 
            new_staff_id, can_groom_val, can_vet_val, can_bathe_val;
            
    ELSIF user_role = 'admin' THEN
        RAISE NOTICE 'Admin role assigned to user %', NEW.id;
        
    -- Legacy compatibility - convert old roles to staff profiles
    ELSIF user_role = 'groomer' THEN
        -- Insert legacy groomer record for compatibility
        INSERT INTO public.groomers_legacy (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Create staff profile with grooming + bathing capabilities
        INSERT INTO public.staff_profiles (
            user_id, name, can_groom, can_vet, can_bathe, location_id, active
        )
        VALUES (NEW.id, user_name, true, false, true, default_location_id, true)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Legacy groomer converted to staff profile for user %', NEW.id;
        
    ELSIF user_role = 'vet' THEN
        -- Insert legacy vet record for compatibility
        INSERT INTO public.veterinarians_legacy (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Create staff profile with vet capability only
        INSERT INTO public.staff_profiles (
            user_id, name, can_groom, can_vet, can_bathe, location_id, active
        )
        VALUES (NEW.id, user_name, false, true, false, default_location_id, true)
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

-- Add unique constraint to prevent duplicate staff availability slots
ALTER TABLE public.staff_availability 
DROP CONSTRAINT IF EXISTS unique_staff_availability;

ALTER TABLE public.staff_availability 
ADD CONSTRAINT unique_staff_availability 
UNIQUE (staff_profile_id, date, time_slot);

-- Generate availability for existing staff profiles that don't have any
DO $$
DECLARE
  staff_record record;
  target_end_date date := (CURRENT_DATE + interval '120 days')::date;
BEGIN
  RAISE NOTICE 'Generating availability for existing staff profiles...';
  
  FOR staff_record IN 
    SELECT id FROM public.staff_profiles 
    WHERE active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_availability 
      WHERE staff_profile_id = staff_profiles.id
    )
  LOOP
    RAISE NOTICE 'Generating availability for existing staff %', staff_record.id;
    PERFORM public.ensure_staff_availability(
        staff_record.id, 
        CURRENT_DATE, 
        target_end_date
    );
  END LOOP;
  
  RAISE NOTICE 'Availability generation completed for existing staff';
END $$;