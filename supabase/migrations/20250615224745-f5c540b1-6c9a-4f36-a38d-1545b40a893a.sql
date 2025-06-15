
-- Enable RLS on pets table if not already enabled
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can create their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can delete their own pets" ON public.pets;

-- Create RLS policies for pets table
CREATE POLICY "Users can view their own pets"
  ON public.pets
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own pets"
  ON public.pets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pets"
  ON public.pets
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own pets"
  ON public.pets
  FOR DELETE
  USING (user_id = auth.uid());
