
-- Update registration_codes table to support the new account types
ALTER TABLE public.registration_codes 
DROP CONSTRAINT IF EXISTS registration_codes_role_check;

-- Add constraint for new role values
ALTER TABLE public.registration_codes 
ADD CONSTRAINT registration_codes_role_check 
CHECK (role IN ('staff', 'admin'));

-- Update existing admin codes to use new 'admin' role
UPDATE public.registration_codes 
SET role = 'admin' 
WHERE role = 'groomer';

-- Add some staff registration codes
INSERT INTO public.registration_codes (code, role, is_used, created_at) VALUES
('STAFF-001', 'staff', false, now()),
('STAFF-002', 'staff', false, now()),
('STAFF-003', 'staff', false, now()),
('STAFF-004', 'staff', false, now()),
('STAFF-005', 'staff', false, now());

-- Ensure staff_profiles table has location_id as optional
-- (checking if we need to modify the existing constraint)
ALTER TABLE public.staff_profiles 
ALTER COLUMN location_id DROP NOT NULL;
