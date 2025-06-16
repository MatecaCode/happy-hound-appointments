
-- Clean slate: Drop ALL existing policies and recreate properly
DROP POLICY IF EXISTS "Users can view their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can create their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can delete their own pets" ON public.pets;

-- Recreate all policies correctly
CREATE POLICY "Users can view their own pets"
  ON public.pets
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own pets"
  ON public.pets
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own pets"
  ON public.pets
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own pets"
  ON public.pets
  FOR DELETE
  USING (user_id = auth.uid());

-- Verify trigger is active
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'assign_user_id';
