
-- Add the missing unique constraint on provider_profiles
ALTER TABLE public.provider_profiles 
ADD CONSTRAINT provider_profiles_user_id_type_unique 
UNIQUE (user_id, type);

-- Update the handle_new_user function to handle the constraint properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    user_role text;
    user_name text;
    provider_profile_id uuid;
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
