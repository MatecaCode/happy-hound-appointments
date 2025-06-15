
-- Enable RLS and restrict updates to only admins

ALTER TABLE public.shower_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow update for all" ON public.shower_availability;

CREATE POLICY "Admins can update shower availability"
  ON public.shower_availability
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Keep SELECT wide open (readable by all for now, adjust if needed)
DROP POLICY IF EXISTS "Allow select to all" ON public.shower_availability;

CREATE POLICY "Allow select to all"
  ON public.shower_availability
  FOR SELECT
  USING (true);

-- No insert/delete for regular users (can add insert policy for admins as needed later)
DROP POLICY IF EXISTS "Allow insert to all" ON public.shower_availability;
DROP POLICY IF EXISTS "Allow delete to all" ON public.shower_availability;
