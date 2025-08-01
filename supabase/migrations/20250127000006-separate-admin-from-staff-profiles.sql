-- Migration to separate admin roles from staff profiles
-- This ensures admins are not service providers and don't appear in booking logic

-- Step 1: Update the assign_user_role_from_code function to work with staff_registration_codes
CREATE OR REPLACE FUNCTION public.assign_user_role_from_code(
  p_user_id uuid,
  p_registration_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_account_type text;
  code_role text;
BEGIN
  -- Get the account_type from the registration code
  SELECT account_type INTO code_account_type
  FROM public.staff_registration_codes
  WHERE code = p_registration_code
    AND (is_used = FALSE OR is_used IS NULL);

  IF code_account_type IS NULL THEN
    RAISE EXCEPTION 'Invalid or already used registration code';
  END IF;

  -- Map account_type to role
  IF code_account_type = 'admin' THEN
    code_role := 'admin';
  ELSIF code_account_type = 'staff' THEN
    code_role := 'staff';
  ELSE
    RAISE EXCEPTION 'Invalid account type: %', code_account_type;
  END IF;

  -- Insert the user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, code_role)
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;

  -- Mark the code as used
  UPDATE public.staff_registration_codes
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE code = p_registration_code;

  RAISE NOTICE 'Assigned role % to user % from account_type %', code_role, p_user_id, code_account_type;
END;
$$;

-- Step 2: Update handle_new_user function to NOT create staff profiles for admins
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
        -- DO NOT create staff profile for admins
        -- Admins are not service providers and should not appear in booking logic
        RAISE NOTICE 'Admin role assigned to user % - NO staff profile created', NEW.id;
    END IF;
    
    RAISE NOTICE 'User creation process completed successfully for %', NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in handle_new_user for user %: % %', NEW.id, SQLERRM, SQLSTATE;
END;
$function$;

-- Step 3: Update staff selection queries to exclude admins
-- Create a view that only shows actual staff (not admins) for booking
CREATE OR REPLACE VIEW public.available_staff AS
SELECT 
    sp.id,
    sp.user_id,
    sp.name,
    sp.email,
    sp.can_groom,
    sp.can_vet,
    sp.can_bathe,
    sp.location_id,
    sp.active,
    l.name as location_name
FROM public.staff_profiles sp
LEFT JOIN public.locations l ON sp.location_id = l.id
WHERE sp.active = true
  AND sp.user_id NOT IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  );

-- Grant permissions on the view
GRANT SELECT ON public.available_staff TO authenticated;

-- Step 4: Update any existing admin users to remove their staff profiles
-- This ensures existing admins don't appear in booking logic
DELETE FROM public.staff_profiles 
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);

-- Step 5: Add RLS policy to ensure staff_profiles are only accessible by actual staff
CREATE POLICY "Only staff can view staff profiles" ON public.staff_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin')
    )
  );

-- Step 6: Update the get_user_role function to handle the new logic
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = p_user_id;

  RETURN COALESCE(user_role, 'client');
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.assign_user_role_from_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated; 