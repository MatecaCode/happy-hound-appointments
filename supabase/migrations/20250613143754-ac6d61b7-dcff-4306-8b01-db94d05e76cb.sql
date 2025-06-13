
-- Create user_roles table with proper structure
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client', 'groomer', 'vet')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

-- Enable Row-Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can insert/update/delete roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create reusable function to check user roles (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
