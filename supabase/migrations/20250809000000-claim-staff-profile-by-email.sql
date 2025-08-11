-- Claim/link a staff profile to a newly signed-up auth user by email and invite code
-- Constraints: no new tables, reuse staff_registration_codes, staff_profiles, user_roles.

-- Function: claim_staff_profile_by_email
CREATE OR REPLACE FUNCTION public.claim_staff_profile_by_email(
  p_user_id uuid,
  p_email text,
  p_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_id uuid;
  v_linked_id uuid;
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_email IS NULL OR p_code IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters';
  END IF;

  -- Validate invite code (must be staff and unused)
  SELECT id INTO v_code_id
  FROM public.staff_registration_codes
  WHERE code = p_code
    AND account_type = 'staff'
    AND (is_used = FALSE OR is_used IS NULL)
  FOR UPDATE;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or already used code';
  END IF;

  -- Idempotency: already linked profile for this user/email
  SELECT id INTO v_existing_id
  FROM public.staff_profiles
  WHERE email = p_email AND user_id = p_user_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Ensure role exists (upsert-safe)
    INSERT INTO public.user_roles(user_id, role)
    VALUES (p_user_id, 'staff')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    -- Mark code as used
    UPDATE public.staff_registration_codes
    SET is_used = TRUE, used_by = p_user_id, used_at = NOW()
    WHERE id = v_code_id;

    RETURN v_existing_id;
  END IF;

  -- Try to link an existing unlinked staff profile by email
  UPDATE public.staff_profiles
  SET user_id = p_user_id, updated_at = NOW()
  WHERE email = p_email AND user_id IS NULL
  RETURNING id INTO v_linked_id;

  IF v_linked_id IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (p_user_id, 'staff')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    UPDATE public.staff_registration_codes
    SET is_used = TRUE, used_by = p_user_id, used_at = NOW()
    WHERE id = v_code_id;

    RETURN v_linked_id;
  END IF;

  -- No pre-created profile: create a new minimal staff profile (triggers will seed availability)
  INSERT INTO public.staff_profiles(
    user_id, email, name, can_bathe, can_groom, can_vet, active
  )
  VALUES (
    p_user_id,
    p_email,
    COALESCE((SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = p_user_id), p_email),
    FALSE,
    FALSE,
    FALSE,
    TRUE
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (p_user_id, 'staff')
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.staff_registration_codes
  SET is_used = TRUE, used_by = p_user_id, used_at = NOW()
  WHERE id = v_code_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_staff_profile_by_email(uuid, text, text) TO authenticated;

-- Admin helper to generate an invite code for staff onboarding (optional notes)
CREATE OR REPLACE FUNCTION public.create_staff_invite_code(
  p_email text,
  p_notes text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
BEGIN
  -- Only admins may generate invite codes
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Generate a unique code (STAFF-<12 hex>)
  v_code := 'STAFF-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 12);

  INSERT INTO public.staff_registration_codes(code, account_type, is_used, notes)
  VALUES (v_code, 'staff', FALSE, COALESCE(p_notes, CONCAT('Admin invite for ', COALESCE(p_email, 'unknown'))));

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_invite_code(text, text) TO authenticated;


