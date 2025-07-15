-- Update RLS policies for appointments table to support atomic cancellation workflow

-- First, let's check if there are any gaps in the current policies
-- The atomic cancellation function needs to be able to update appointment status

-- Add a more comprehensive policy for authenticated users to update their own appointments
-- This ensures the atomic function can update status for client's own appointments
DROP POLICY IF EXISTS "Clients can update their own appointments" ON appointments;
CREATE POLICY "Clients can update their own appointments"
ON appointments
FOR UPDATE
TO authenticated
USING (
  client_id IN (
    SELECT clients.id 
    FROM clients 
    WHERE clients.user_id = auth.uid()
  )
);

-- Add policy for staff to update appointments they're assigned to
DROP POLICY IF EXISTS "Staff can update appointments assigned to them" ON appointments;
CREATE POLICY "Staff can update appointments assigned to them"
ON appointments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM appointment_staff 
    JOIN staff_profiles ON appointment_staff.staff_profile_id = staff_profiles.id
    WHERE appointment_staff.appointment_id = appointments.id 
    AND staff_profiles.user_id = auth.uid()
  )
);

-- Ensure the atomic cancellation function can work with service definer privileges
-- Add a policy that allows the atomic function to access appointment data
DROP POLICY IF EXISTS "System can update appointments for cancellation" ON appointments;
CREATE POLICY "System can update appointments for cancellation"
ON appointments
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is the client
  client_id IN (
    SELECT clients.id 
    FROM clients 
    WHERE clients.user_id = auth.uid()
  )
  OR
  -- Allow if user is assigned staff
  EXISTS (
    SELECT 1 
    FROM appointment_staff 
    JOIN staff_profiles ON appointment_staff.staff_profile_id = staff_profiles.id
    WHERE appointment_staff.appointment_id = appointments.id 
    AND staff_profiles.user_id = auth.uid()
  )
  OR
  -- Allow if user has admin role
  has_role(auth.uid(), 'admin'::text)
);

-- Ensure the atomic cancellation function can read appointment data
DROP POLICY IF EXISTS "Enhanced read access for cancellation" ON appointments;
CREATE POLICY "Enhanced read access for cancellation"
ON appointments
FOR SELECT
TO authenticated
USING (
  -- Allow if user is the client
  client_id IN (
    SELECT clients.id 
    FROM clients 
    WHERE clients.user_id = auth.uid()
  )
  OR
  -- Allow if user is assigned staff
  EXISTS (
    SELECT 1 
    FROM appointment_staff 
    JOIN staff_profiles ON appointment_staff.staff_profile_id = staff_profiles.id
    WHERE appointment_staff.appointment_id = appointments.id 
    AND staff_profiles.user_id = auth.uid()
  )
  OR
  -- Allow if user has admin role
  has_role(auth.uid(), 'admin'::text)
);

-- Add RLS policies for staff_availability table to allow cancellation function to revert slots
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

-- Allow staff to update their own availability (for cancellation slot reversion)
DROP POLICY IF EXISTS "Staff can update their own availability" ON staff_availability;
CREATE POLICY "Staff can update their own availability"
ON staff_availability
FOR UPDATE
TO authenticated
USING (
  staff_profile_id IN (
    SELECT staff_profiles.id 
    FROM staff_profiles 
    WHERE staff_profiles.user_id = auth.uid()
  )
  OR
  has_role(auth.uid(), 'admin'::text)
);

-- Allow reading staff availability for cancellation logic
DROP POLICY IF EXISTS "Anyone can read staff availability" ON staff_availability;
CREATE POLICY "Anyone can read staff availability"
ON staff_availability
FOR SELECT
TO authenticated
USING (true);

-- Allow system to update staff availability during cancellation
DROP POLICY IF EXISTS "System can update staff availability for cancellation" ON staff_availability;
CREATE POLICY "System can update staff availability for cancellation"
ON staff_availability
FOR UPDATE
TO authenticated
USING (true);

-- Add RLS policies for appointment_staff table to allow cancellation function to read assignments
ALTER TABLE appointment_staff ENABLE ROW LEVEL SECURITY;

-- Allow reading appointment staff assignments for cancellation logic
DROP POLICY IF EXISTS "Anyone can read appointment staff assignments" ON appointment_staff;
CREATE POLICY "Anyone can read appointment staff assignments"
ON appointment_staff
FOR SELECT
TO authenticated
USING (true);

-- Grant necessary permissions to the atomic_cancel_appointment function
-- This ensures the function can execute with proper privileges
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON appointments TO authenticated;
GRANT SELECT, UPDATE ON staff_availability TO authenticated;
GRANT SELECT ON appointment_staff TO authenticated;
GRANT SELECT ON staff_profiles TO authenticated;
GRANT SELECT ON services TO authenticated;