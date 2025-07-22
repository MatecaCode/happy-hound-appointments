-- Fix user_roles constraint to include 'staff' role

-- Drop the old constraint that doesn't include 'staff'
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new constraint that includes all valid roles including 'staff'
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'client'::text, 'groomer'::text, 'vet'::text, 'staff'::text]));