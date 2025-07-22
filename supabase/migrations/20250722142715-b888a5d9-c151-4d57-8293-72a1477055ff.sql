-- Fix user_roles constraint to include 'staff' role and repair data consistency

-- 1. Drop the old constraint that doesn't include 'staff'
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- 2. Add new constraint that includes all valid roles including 'staff'
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'client'::text, 'groomer'::text, 'vet'::text, 'staff'::text]));

-- 3. Now fix the data consistency for the user who couldn't register properly
DO $$
DECLARE
    target_user_id uuid := 'bbecfb8d-c37c-4c5f-88d7-d24f8932948a';
    user_name text := 'Matheus Soler';
    user_email text := 'matheus.soler@clearsulting.com';
    default_location_id uuid;
    new_staff_profile_id uuid;
BEGIN
    -- Get the first active location
    SELECT id INTO default_location_id FROM public.locations WHERE active = true LIMIT 1;
    
    -- Create missing user role entry
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (target_user_id, 'staff', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create missing staff profile with the capabilities that were intended
    INSERT INTO public.staff_profiles (
        user_id, 
        name, 
        email, 
        can_groom, 
        can_vet, 
        can_bathe, 
        location_id,
        active,
        created_at
    )
    VALUES (
        target_user_id, 
        user_name, 
        user_email, 
        true,  -- can_groom based on registration attempt
        false, -- can_vet
        true,  -- can_bathe (default for groomers)
        default_location_id,
        true,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        can_groom = EXCLUDED.can_groom,
        can_vet = EXCLUDED.can_vet,
        can_bathe = EXCLUDED.can_bathe,
        location_id = EXCLUDED.location_id,
        active = EXCLUDED.active,
        updated_at = NOW()
    RETURNING id INTO new_staff_profile_id;
        
    -- Generate staff availability for the next 90 days
    IF new_staff_profile_id IS NOT NULL THEN
        PERFORM public.ensure_staff_availability(
            new_staff_profile_id,
            CURRENT_DATE,
            (CURRENT_DATE + interval '90 days')::date
        );
    END IF;
    
    RAISE NOTICE 'Fixed data consistency for user % - created staff profile and availability', target_user_id;
END $$;