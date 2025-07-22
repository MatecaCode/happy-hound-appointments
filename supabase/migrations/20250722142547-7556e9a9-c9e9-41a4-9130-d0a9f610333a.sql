-- Fix the data consistency issue by creating the missing staff profile
-- for the existing auth user who attempted signup

DO $$
DECLARE
    target_user_id uuid := 'bbecfb8d-c37c-4c5f-88d7-d24f8932948a';
    user_name text := 'Matheus Soler';
    user_email text := 'matheus.soler@clearsulting.com';
    default_location_id uuid;
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
        updated_at = NOW();
        
    -- Generate staff availability for the next 90 days
    PERFORM public.ensure_staff_availability(
        (SELECT id FROM staff_profiles WHERE user_id = target_user_id),
        CURRENT_DATE,
        (CURRENT_DATE + interval '90 days')::date
    );
    
    RAISE NOTICE 'Fixed data consistency for user % - created staff profile and availability', target_user_id;
END $$;