-- Fix the unique constraint on staff_profiles table
-- The current constraint requires both user_id and location_id to be unique,
-- but this causes issues when location_id is NULL
ALTER TABLE staff_profiles DROP CONSTRAINT staff_profiles_user_id_location_id_key;

-- Add a simpler constraint that only requires user_id to be unique
-- This ensures a user can only have one staff profile
ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_user_id_key UNIQUE (user_id);

-- Update the handle_new_user function to handle NULL location_id properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    user_role text;
    user_name text;
    can_groom_val boolean;
    can_vet_val boolean;
    can_bathe_val boolean;
    default_location_id uuid;
    location_from_metadata uuid;
BEGIN
    -- Get role and name from user metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário');
    
    RAISE NOTICE 'Processing new user: ID=%, role=%, name=%', NEW.id, user_role, user_name;
    
    -- Get default location (first location if exists)
    SELECT id INTO default_location_id FROM public.locations WHERE active = true LIMIT 1;
    
    -- Create profile entries based on role
    IF user_role = 'client' THEN
        INSERT INTO public.clients (user_id, name, email)
        VALUES (NEW.id, user_name, NEW.email)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Client profile created for user %', NEW.id;
        
    ELSIF user_role = 'staff' THEN
        -- Get staff capabilities from user metadata with defaults
        can_groom_val := COALESCE((NEW.raw_user_meta_data->>'can_groom')::boolean, false);
        can_vet_val := COALESCE((NEW.raw_user_meta_data->>'can_vet')::boolean, false);
        can_bathe_val := COALESCE((NEW.raw_user_meta_data->>'can_bathe')::boolean, false);
        
        -- Get location_id from metadata or use default
        BEGIN
            location_from_metadata := (NEW.raw_user_meta_data->>'location_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            location_from_metadata := NULL;
        END;
        
        -- Create staff profile with capabilities
        INSERT INTO public.staff_profiles (
            user_id, name, email, can_groom, can_vet, can_bathe, 
            location_id, active
        )
        VALUES (
            NEW.id, user_name, NEW.email, can_groom_val, can_vet_val, can_bathe_val, 
            COALESCE(location_from_metadata, default_location_id), true
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Staff profile created: can_groom=%, can_vet=%, can_bathe=%, location_id=%', 
            can_groom_val, can_vet_val, can_bathe_val, COALESCE(location_from_metadata, default_location_id);
            
    ELSIF user_role = 'admin' THEN
        -- Create staff profile with admin capabilities (can do everything)
        INSERT INTO public.staff_profiles (
            user_id, name, email, can_groom, can_vet, can_bathe, location_id, active
        )
        VALUES (NEW.id, user_name, NEW.email, true, true, true, default_location_id, true)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Admin staff profile created for user %', NEW.id;
    END IF;
    
    RAISE NOTICE 'User creation process completed successfully for %', NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in handle_new_user for user %: % %', NEW.id, SQLERRM, SQLSTATE;
END;
$function$;