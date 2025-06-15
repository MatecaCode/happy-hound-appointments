
-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Users can create their own pets" ON public.pets;

-- Create a more permissive insert policy for authenticated users
CREATE POLICY "Users can create their own pets"
  ON public.pets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_pet_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS assign_user_id ON public.pets;

-- Create trigger to automatically assign user_id before insert
CREATE TRIGGER assign_user_id
  BEFORE INSERT ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION set_pet_user_id();
