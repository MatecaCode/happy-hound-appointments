
-- First, ensure we have provider_profiles for all existing groomers and vets
INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
SELECT g.user_id, 'groomer', NULL, NOW()
FROM public.groomers g
WHERE g.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_profiles pp 
    WHERE pp.user_id = g.user_id AND pp.type = 'groomer'
  );

INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
SELECT v.user_id, 'vet', NULL, NOW()
FROM public.veterinarians v
WHERE v.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_profiles pp 
    WHERE pp.user_id = v.user_id AND pp.type = 'vet'
  );

-- Update the handle_new_user function to ensure provider profiles are always created
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
    
    -- Create profile entries for backwards compatibility
    IF user_role = 'client' THEN
        INSERT INTO public.clients (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
    ELSIF user_role = 'groomer' THEN
        -- Insert groomer record
        INSERT INTO public.groomers (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- CRITICAL: Always create provider profile for groomer
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'groomer', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
        
        -- Get the provider_id and generate availability
        SELECT pp.id INTO new_provider_id
        FROM public.provider_profiles pp
        WHERE pp.user_id = NEW.id AND pp.type = 'groomer';
        
        IF new_provider_id IS NOT NULL THEN
            RAISE NOTICE 'Created/found groomer provider profile %, generating availability', new_provider_id;
            
            -- Generate availability if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM public.provider_availability pa
                WHERE pa.provider_id = new_provider_id
                LIMIT 1
            ) THEN
                PERFORM public.ensure_provider_availability(
                    new_provider_id,
                    CURRENT_DATE,
                    (CURRENT_DATE + interval '90 days')::date
                );
                
                -- Also ensure shower availability exists
                PERFORM public.ensure_shower_availability(
                    CURRENT_DATE,
                    (CURRENT_DATE + interval '90 days')::date
                );
            END IF;
        ELSE
            RAISE WARNING 'Failed to create/find provider profile for groomer %', NEW.id;
        END IF;
        
    ELSIF user_role = 'vet' THEN
        -- Insert veterinarian record
        INSERT INTO public.veterinarians (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- CRITICAL: Always create provider profile for vet
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'vet', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
        
        -- Get the provider_id and generate availability
        SELECT pp.id INTO new_provider_id
        FROM public.provider_profiles pp
        WHERE pp.user_id = NEW.id AND pp.type = 'vet';
        
        IF new_provider_id IS NOT NULL THEN
            RAISE NOTICE 'Created/found vet provider profile %, generating availability', new_provider_id;
            
            -- Generate availability if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM public.provider_availability pa
                WHERE pa.provider_id = new_provider_id
                LIMIT 1
            ) THEN
                PERFORM public.ensure_provider_availability(
                    new_provider_id,
                    CURRENT_DATE,
                    (CURRENT_DATE + interval '90 days')::date
                );
            END IF;
        ELSE
            RAISE WARNING 'Failed to create/find provider profile for vet %', NEW.id;
        END IF;
    END IF;
    
    RAISE NOTICE 'User creation process completed successfully for %', NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in handle_new_user for user %: % %', NEW.id, SQLERRM, SQLSTATE;
END;
$$;

-- Create a utility function to manually fix missing provider profiles
CREATE OR REPLACE FUNCTION public.fix_missing_provider_profiles()
RETURNS TABLE(user_id uuid, provider_type text, action text)
LANGUAGE plpgsql
AS $$
DECLARE
    groomer_record record;
    vet_record record;
    new_provider_id uuid;
BEGIN
    -- Fix missing groomer profiles
    FOR groomer_record IN 
        SELECT g.user_id, g.name FROM public.groomers g
        WHERE g.user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.provider_profiles pp 
            WHERE pp.user_id = g.user_id AND pp.type = 'groomer'
          )
    LOOP
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (groomer_record.user_id, 'groomer', NULL, NOW())
        RETURNING id INTO new_provider_id;
        
        -- Generate availability
        PERFORM public.ensure_provider_availability(
            new_provider_id,
            CURRENT_DATE,
            (CURRENT_DATE + interval '90 days')::date
        );
        
        RETURN QUERY SELECT groomer_record.user_id, 'groomer'::text, 'created_profile_and_availability'::text;
    END LOOP;
    
    -- Fix missing vet profiles
    FOR vet_record IN 
        SELECT v.user_id, v.name FROM public.veterinarians v
        WHERE v.user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.provider_profiles pp 
            WHERE pp.user_id = v.user_id AND pp.type = 'vet'
          )
    LOOP
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (vet_record.user_id, 'vet', NULL, NOW())
        RETURNING id INTO new_provider_id;
        
        -- Generate availability
        PERFORM public.ensure_provider_availability(
            new_provider_id,
            CURRENT_DATE,
            (CURRENT_DATE + interval '90 days')::date
        );
        
        RETURN QUERY SELECT vet_record.user_id, 'vet'::text, 'created_profile_and_availability'::text;
    END LOOP;
END;
$$;

-- Run the fix function to repair existing data
SELECT * FROM public.fix_missing_provider_profiles();
