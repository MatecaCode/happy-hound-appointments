
-- First, let's recreate the trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the handle_new_user function with better error handling and logging
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
BEGIN
    -- Get role and name from user metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário');
    
    RAISE NOTICE 'Processing new user: ID=%, role=%, name=%', NEW.id, user_role, user_name;
    
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
        
        -- Get the provider_id using a different variable name to avoid conflicts
        SELECT pp.id INTO new_provider_id
        FROM public.provider_profiles pp
        WHERE pp.user_id = NEW.id AND pp.type = 'groomer';
        
        RAISE NOTICE 'Retrieved provider_id % for groomer %', new_provider_id, NEW.id;
        
        -- Generate availability if provider exists and doesn't have availability yet
        IF new_provider_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.provider_availability pa
                WHERE pa.provider_id = new_provider_id
                LIMIT 1
            ) THEN
                RAISE NOTICE 'Generating availability for groomer provider %', new_provider_id;
                PERFORM public.ensure_provider_availability(
                    new_provider_id,
                    CURRENT_DATE,
                    (CURRENT_DATE + interval '90 days')::date
                );
                RAISE NOTICE 'Availability generation completed for provider %', new_provider_id;
            ELSE
                RAISE NOTICE 'Availability already exists for groomer provider %', new_provider_id;
            END IF;
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
        
        -- Get the provider_id using a different variable name to avoid conflicts
        SELECT pp.id INTO new_provider_id
        FROM public.provider_profiles pp
        WHERE pp.user_id = NEW.id AND pp.type = 'vet';
        
        RAISE NOTICE 'Retrieved provider_id % for vet %', new_provider_id, NEW.id;
        
        -- Generate availability if provider exists and doesn't have availability yet
        IF new_provider_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.provider_availability pa
                WHERE pa.provider_id = new_provider_id
                LIMIT 1
            ) THEN
                RAISE NOTICE 'Generating availability for vet provider %', new_provider_id;
                PERFORM public.ensure_provider_availability(
                    new_provider_id,
                    CURRENT_DATE,
                    (CURRENT_DATE + interval '90 days')::date
                );
                RAISE NOTICE 'Availability generation completed for provider %', new_provider_id;
            ELSE
                RAISE NOTICE 'Availability already exists for vet provider %', new_provider_id;
            END IF;
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

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger exists
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
