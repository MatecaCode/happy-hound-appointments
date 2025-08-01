-- Create new user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'staff', 'client')),
  created_at timestamptz DEFAULT now()
);

-- Add role column to staff_registration_codes if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_registration_codes' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.staff_registration_codes ADD COLUMN role text CHECK (role IN ('admin', 'staff'));
  END IF;
END $$;

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
-- Users can view their own role
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow inserts during registration
CREATE POLICY "Allow role insertion during registration" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to assign role based on registration code
CREATE OR REPLACE FUNCTION public.assign_user_role_from_code(
  p_user_id uuid,
  p_registration_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_role text;
BEGIN
  -- Get the role from the registration code
  SELECT role INTO code_role
  FROM public.staff_registration_codes
  WHERE code = p_registration_code
    AND used = false
    AND expires_at > now();

  IF code_role IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired registration code';
  END IF;

  -- Insert the user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, code_role)
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;

  -- Mark the code as used
  UPDATE public.staff_registration_codes
  SET used = true, used_by = p_user_id, used_at = now()
  WHERE code = p_registration_code;

  RAISE NOTICE 'Assigned role % to user %', code_role, p_user_id;
END;
$$;

-- Create function to get user role
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
GRANT SELECT ON public.user_roles TO authenticated;
GRANT INSERT ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role_from_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated; 