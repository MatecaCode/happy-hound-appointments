-- Add RLS policies for appointment_staff table to allow booking system to function

-- Allow authenticated users to insert appointment staff assignments during booking
CREATE POLICY "Users can create appointment staff assignments" 
ON public.appointment_staff 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow admins to manage all appointment staff assignments
CREATE POLICY "Admins can manage all appointment staff assignments" 
ON public.appointment_staff 
FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::text));

-- Allow staff to update their own assignment details if needed
CREATE POLICY "Staff can update their own assignments" 
ON public.appointment_staff 
FOR UPDATE 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM staff_profiles sp 
    WHERE sp.id = appointment_staff.staff_profile_id 
    AND sp.user_id = auth.uid()
));

-- Allow system/admins to delete appointment staff assignments (for rebooking/cancellation)
CREATE POLICY "Admins can delete appointment staff assignments" 
ON public.appointment_staff 
FOR DELETE 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::text));