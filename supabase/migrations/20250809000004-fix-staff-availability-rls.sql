-- Fix RLS policy for staff_availability to allow admin-created profiles
-- The issue is that when admin creates a staff profile, the trigger tries to insert availability
-- but the RLS policy blocks it because user_id is NULL for admin-created profiles

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Admins and staff can insert staff availability" ON staff_availability;

-- Create a new INSERT policy that allows triggers to work for admin-created profiles
CREATE POLICY "Admins and staff can insert staff availability" ON staff_availability
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  staff_profile_id IN (
    SELECT staff_profiles.id 
    FROM staff_profiles 
    WHERE staff_profiles.user_id = auth.uid()
  ) OR
  -- Allow inserts for staff profiles that don't have a user_id yet (admin-created profiles)
  staff_profile_id IN (
    SELECT staff_profiles.id 
    FROM staff_profiles 
    WHERE staff_profiles.user_id IS NULL
  )
);

-- Add a comment explaining the policy
COMMENT ON POLICY "Admins and staff can insert staff availability" ON staff_availability IS 
'Allows admins to insert availability for any staff, staff to insert their own availability, and triggers to insert availability for admin-created profiles (where user_id is NULL)';
