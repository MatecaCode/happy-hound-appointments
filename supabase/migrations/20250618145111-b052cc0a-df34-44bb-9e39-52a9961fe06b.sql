
-- First, let's make sure the trigger exists and is working properly
DROP TRIGGER IF EXISTS on_provider_profile_created ON public.provider_profiles;

-- Recreate the trigger function with better error handling and logging
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

-- Create the trigger to fire after insert on provider_profiles
CREATE TRIGGER on_provider_profile_created
  AFTER INSERT ON public.provider_profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_provider_profile();

-- Also update the handle_new_user function to ensure it properly creates provider profiles
-- and triggers the availability generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    user_role text;
    user_name text;
BEGIN
    -- Get role and name from user metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário');
    
    RAISE NOTICE 'New user created: ID=%, role=%, name=%', NEW.id, user_role, user_name;
    
    -- Insert role into user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create profile entries for backwards compatibility
    IF user_role = 'client' THEN
        INSERT INTO public.clients (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF user_role = 'groomer' THEN
        INSERT INTO public.groomers (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Create provider profile for groomer (this will trigger availability generation)
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'groomer', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
        
        RAISE NOTICE 'Created groomer provider profile for user %', NEW.id;
        
    ELSIF user_role = 'vet' THEN
        INSERT INTO public.veterinarians (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Create provider profile for vet (this will trigger availability generation)
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'vet', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
        
        RAISE NOTICE 'Created vet provider profile for user %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Test the availability generation functions to make sure they work
DO $$
BEGIN
  -- Test the generate_time_slots function
  IF NOT EXISTS (SELECT 1 FROM public.generate_time_slots() LIMIT 1) THEN
    RAISE EXCEPTION 'generate_time_slots function is not working properly';
  END IF;
  
  RAISE NOTICE 'Availability generation functions are working correctly';
END $$;
