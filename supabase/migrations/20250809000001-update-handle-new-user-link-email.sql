-- Update handle_new_user to link existing admin-created staff_profiles by email
-- before creating a new staff profile, preventing duplicates.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    user_role text;
    user_name text;
    can_groom_val boolean;
    can_vet_val boolean;
    can_bathe_val boolean;
    default_location_id uuid;
    location_from_metadata uuid;
    linked_id uuid;
BEGIN
    -- Determine role and name from metadata (fallbacks)
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário');

    RAISE NOTICE '[handle_new_user] New user %, role=%', NEW.id, user_role;

    -- Ensure a role row exists (upsert-safe). If you maintain roles elsewhere, keep this for safety.
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id) DO NOTHING;

    -- Default active location (optional, matches prior behavior)
    SELECT id INTO default_location_id FROM public.locations WHERE active = true LIMIT 1;

    IF user_role = 'client' THEN
        INSERT INTO public.clients (user_id, name, email)
        VALUES (NEW.id, user_name, NEW.email)
        ON CONFLICT (user_id) DO NOTHING;

    ELSIF user_role = 'staff' THEN
        -- Attempt to link an existing admin-created staff profile by email (if unlinked)
        UPDATE public.staff_profiles
        SET user_id = NEW.id, updated_at = NOW()
        WHERE email = NEW.email AND user_id IS NULL
        RETURNING id INTO linked_id;

        IF linked_id IS NOT NULL THEN
            RAISE NOTICE '[handle_new_user] Linked existing staff_profiles % to user %', linked_id, NEW.id;
            RETURN NEW;
        END IF;

        -- No pre-existing unlinked profile: create a new one from metadata flags
        can_groom_val := COALESCE((NEW.raw_user_meta_data->>'can_groom')::boolean, false);
        can_vet_val := COALESCE((NEW.raw_user_meta_data->>'can_vet')::boolean, false);
        can_bathe_val := COALESCE((NEW.raw_user_meta_data->>'can_bathe')::boolean, false);

        BEGIN
            location_from_metadata := (NEW.raw_user_meta_data->>'location_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            location_from_metadata := NULL;
        END;

        INSERT INTO public.staff_profiles (
            user_id, name, email, can_groom, can_vet, can_bathe, 
            location_id, active
        ) VALUES (
            NEW.id, user_name, NEW.email, can_groom_val, can_vet_val, can_bathe_val,
            COALESCE(location_from_metadata, default_location_id), true
        )
        ON CONFLICT (user_id) DO NOTHING;

        RAISE NOTICE '[handle_new_user] Created staff_profiles for user %', NEW.id;

    ELSIF user_role = 'admin' THEN
        -- Do not create staff profile for admins (matches current separation)
        RAISE NOTICE '[handle_new_user] Admin user created % - no staff profile', NEW.id;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '[handle_new_user] Error for user %: % (SQLSTATE %)', NEW.id, SQLERRM, SQLSTATE;
END;
$$;


