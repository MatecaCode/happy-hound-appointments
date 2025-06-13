
-- First, ensure we have the user_roles table with proper constraints
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'client', 'groomer', 'vet'));

-- Create a function to migrate existing users to user_roles table (fixed to handle nulls)
CREATE OR REPLACE FUNCTION migrate_existing_users_to_roles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record record;
BEGIN
    -- Migrate clients (only those with non-null user_id)
    FOR user_record IN 
        SELECT user_id FROM public.clients WHERE user_id IS NOT NULL
    LOOP
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_record.user_id, 'client')
        ON CONFLICT (user_id, role) DO NOTHING;
    END LOOP;
    
    -- Migrate groomers (only those with non-null user_id)
    FOR user_record IN 
        SELECT user_id FROM public.groomers WHERE user_id IS NOT NULL
    LOOP
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_record.user_id, 'groomer')
        ON CONFLICT (user_id, role) DO NOTHING;
    END LOOP;
    
    -- Migrate veterinarians (only those with non-null user_id)
    FOR user_record IN 
        SELECT user_id FROM public.veterinarians WHERE user_id IS NOT NULL
    LOOP
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_record.user_id, 'vet')
        ON CONFLICT (user_id, role) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully';
END;
$$;

-- Run the migration
SELECT migrate_existing_users_to_roles();

-- Update the handle_new_user function to use user_roles instead of separate tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    user_role text;
    user_name text;
BEGIN
    -- Get role and name from user metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário');
    
    -- Insert role into user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Still create profile entries for backwards compatibility (can be removed later)
    IF user_role = 'client' THEN
        INSERT INTO public.clients (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF user_role = 'groomer' THEN
        INSERT INTO public.groomers (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF user_role = 'vet' THEN
        INSERT INTO public.veterinarians (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create helper functions for role checking
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id UUID, _role TEXT)
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

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TEXT[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(role) FROM public.user_roles
  WHERE user_id = _user_id;
$$;
