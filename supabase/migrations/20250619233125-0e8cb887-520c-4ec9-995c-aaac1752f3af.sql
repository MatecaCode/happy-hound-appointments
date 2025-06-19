
-- Fix the ambiguous provider_id reference in handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    user_role text;
    user_name text;
    provider_id uuid;
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
        
        -- Create provider profile for groomer
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'groomer', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
        
        -- Always get the provider_id (whether new or existing) - FIX: Be explicit about table
        SELECT pp.id INTO provider_id
        FROM public.provider_profiles pp
        WHERE pp.user_id = NEW.id AND pp.type = 'groomer';
        
        -- Generate availability if provider exists and doesn't have availability yet
        IF provider_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.provider_availability pa
                WHERE pa.provider_id = provider_id
                LIMIT 1
            ) THEN
                RAISE NOTICE 'Generating availability for groomer provider %', provider_id;
                PERFORM public.ensure_provider_availability(
                    provider_id,
                    CURRENT_DATE,
                    (CURRENT_DATE + interval '90 days')::date
                );
            ELSE
                RAISE NOTICE 'Availability already exists for groomer provider %', provider_id;
            END IF;
        END IF;
        
    ELSIF user_role = 'vet' THEN
        INSERT INTO public.veterinarians (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Create provider profile for vet
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'vet', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
        
        -- Always get the provider_id (whether new or existing) - FIX: Be explicit about table
        SELECT pp.id INTO provider_id
        FROM public.provider_profiles pp
        WHERE pp.user_id = NEW.id AND pp.type = 'vet';
        
        -- Generate availability if provider exists and doesn't have availability yet
        IF provider_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.provider_availability pa
                WHERE pa.provider_id = provider_id
                LIMIT 1
            ) THEN
                RAISE NOTICE 'Generating availability for vet provider %', provider_id;
                PERFORM public.ensure_provider_availability(
                    provider_id,
                    CURRENT_DATE,
                    (CURRENT_DATE + interval '90 days')::date
                );
            ELSE
                RAISE NOTICE 'Availability already exists for vet provider %', provider_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;
