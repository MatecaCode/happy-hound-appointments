
-- 1. Refactor the registration trigger

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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

    -- Create profile entries per new schema design
    IF user_role = 'client' THEN
        INSERT INTO public.clients (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF user_role = 'groomer' OR user_role = 'vet' THEN
        INSERT INTO public.provider_profiles (user_id, type, bio, created_at)
        VALUES (NEW.id, user_role, NULL, NOW())
        ON CONFLICT (user_id, type) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- (Re)create the trigger on user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. RLS: Appointments - Only relevant providers can see their own bookings, clients only see theirs, admin see all

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Groomers and vets see their bookings" ON public.appointments;
DROP POLICY IF EXISTS "Clients see their own bookings" ON public.appointments;
DROP POLICY IF EXISTS "Admins see all bookings" ON public.appointments;

CREATE POLICY "Clients see their own bookings"
  ON public.appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'client')
    AND user_id = auth.uid()
  );

CREATE POLICY "Providers see bookings assigned to them"
  ON public.appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          (ur.role = 'groomer' AND provider_id IS NOT NULL AND provider_id IN (SELECT id FROM public.provider_profiles WHERE user_id = auth.uid() AND type = 'groomer'))
          OR
          (ur.role = 'vet' AND provider_id IS NOT NULL AND provider_id IN (SELECT id FROM public.provider_profiles WHERE user_id = auth.uid() AND type = 'vet'))
        )
    )
  );

CREATE POLICY "Admins see all bookings"
  ON public.appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 3. RLS: clients table—users can only see their own record, admin can see all
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client can view own client record" ON public.clients;
DROP POLICY IF EXISTS "Admin can view all client records" ON public.clients;

CREATE POLICY "Client can view own client record"
  ON public.clients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin can view all client records"
  ON public.clients
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 4. RLS: provider_profiles—provider sees own profile, admin sees all
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Provider can view own profile" ON public.provider_profiles;
DROP POLICY IF EXISTS "Admin can view all provider profiles" ON public.provider_profiles;

CREATE POLICY "Provider can view own profile"
  ON public.provider_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin can view all provider profiles"
  ON public.provider_profiles
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
