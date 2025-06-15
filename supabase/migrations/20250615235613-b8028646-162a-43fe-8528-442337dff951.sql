
-- Drop the existing restrictive insert policy that checks user_id before trigger runs
DROP POLICY IF EXISTS "Users can create their own pets" ON public.pets;

-- Create a more permissive insert policy that allows authenticated users to insert
-- The trigger will handle setting the correct user_id
CREATE POLICY "Users can create their own pets"
  ON public.pets
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Verify the trigger exists and is active
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as trigger_type,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'assign_user_id';
