-- Purpose: Add function to check if email already exists in auth.users for self-registration validation
-- This prevents users from registering with emails that are already in the system

-- Function to check if email exists in auth.users
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  email_exists boolean;
BEGIN
  -- Check if email exists in auth.users table
  SELECT EXISTS(
    SELECT 1 
    FROM auth.users 
    WHERE email = p_email
  ) INTO email_exists;
  
  RETURN email_exists;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO authenticated;

-- Also create a function to get user status if email exists
CREATE OR REPLACE FUNCTION public.get_user_status_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_record record;
  result json;
BEGIN
  -- Get user information if email exists
  SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data
  INTO user_record
  FROM auth.users 
  WHERE email = p_email
  LIMIT 1;
  
  IF user_record IS NULL THEN
    RETURN json_build_object('exists', false);
  ELSE
    RETURN json_build_object(
      'exists', true,
      'id', user_record.id,
      'email', user_record.email,
      'email_confirmed_at', user_record.email_confirmed_at,
      'created_at', user_record.created_at,
      'is_confirmed', user_record.email_confirmed_at IS NOT NULL
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_status_by_email(text) TO authenticated;
