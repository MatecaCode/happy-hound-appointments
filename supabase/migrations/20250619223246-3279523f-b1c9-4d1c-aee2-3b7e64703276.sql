

-- Update the handle_new_user function to create provider profiles and generate availability
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
        
        -- Create provider profile for groomer and generate availability
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'groomer', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING
        RETURNING id INTO provider_id;
        
        -- If we got a provider_id (new record was created), generate availability
        IF provider_id IS NOT NULL THEN
            RAISE NOTICE 'Created groomer provider profile %, generating availability', provider_id;
            PERFORM public.ensure_provider_availability(
                provider_id,
                CURRENT_DATE,
                (CURRENT_DATE + interval '90 days')::date
            );
        END IF;
        
    ELSIF user_role = 'vet' THEN
        INSERT INTO public.veterinarians (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Create provider profile for vet and generate availability
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, 'vet', NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING
        RETURNING id INTO provider_id;
        
        -- If we got a provider_id (new record was created), generate availability
        IF provider_id IS NOT NULL THEN
            RAISE NOTICE 'Created vet provider profile %, generating availability', provider_id;
            PERFORM public.ensure_provider_availability(
                provider_id,
                CURRENT_DATE,
                (CURRENT_DATE + interval '90 days')::date
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

