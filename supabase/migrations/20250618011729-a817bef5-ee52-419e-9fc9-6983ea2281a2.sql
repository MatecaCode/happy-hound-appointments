
-- First, let's fix the handle_new_user function to properly create provider profiles
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
        
        -- Create provider profile for groomer
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'groomer', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
    ELSIF user_role = 'vet' THEN
        INSERT INTO public.veterinarians (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Create provider profile for vet
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'vet', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Manually populate provider_profiles for existing groomers that don't have entries
INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
SELECT g.user_id, 'groomer', NULL, NOW()
FROM public.groomers g
WHERE g.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_profiles pp 
    WHERE pp.user_id = g.user_id AND pp.type = 'groomer'
  );

-- Manually populate provider_profiles for existing vets that don't have entries
INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
SELECT v.user_id, 'vet', NULL, NOW()
FROM public.veterinarians v
WHERE v.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_profiles pp 
    WHERE pp.user_id = v.user_id AND pp.type = 'vet'
  );

-- Now trigger the availability generation for all existing provider profiles
DO $$
DECLARE
    provider_record record;
BEGIN
    FOR provider_record IN 
        SELECT id, type FROM public.provider_profiles 
    LOOP
        -- Generate 90 days of availability for each provider
        PERFORM public.ensure_provider_availability(
            provider_record.id, 
            CURRENT_DATE, 
            (CURRENT_DATE + interval '90 days')::date
        );
        
        -- Also ensure shower availability exists (for groomers)
        IF provider_record.type = 'groomer' THEN
            PERFORM public.ensure_shower_availability(
                CURRENT_DATE, 
                (CURRENT_DATE + interval '90 days')::date
            );
        END IF;
    END LOOP;
END $$;

-- Test the roll_daily_availability function to ensure it works
SELECT public.roll_daily_availability();
