-- Fix appointment_staff role constraint to allow service-specific roles
-- This migration addresses the role constraint that was limiting roles to only 'primary', 'assistant', 'vet'

-- 1. Drop the existing role constraint
ALTER TABLE appointment_staff DROP CONSTRAINT IF EXISTS appointment_staff_role_check;

-- 2. Create a new constraint that allows service-specific roles
ALTER TABLE appointment_staff ADD CONSTRAINT appointment_staff_role_check 
CHECK (role = ANY (ARRAY[
    'primary', 
    'assistant', 
    'vet',
    'banhista',
    'tosador', 
    'veterinario'
]));

-- 3. Add a comment explaining the role system
COMMENT ON COLUMN appointment_staff.role IS 
'Role of the staff member in this appointment. 
Service-specific roles: banhista (bather), tosador (groomer), veterinario (vet).
Generic roles: primary (main staff), assistant (helper), vet (veterinarian).'; 