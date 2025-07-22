-- Fix user_roles constraint to include 'staff' role
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'client'::text, 'groomer'::text, 'vet'::text, 'staff'::text]));

-- Rename user_roles to user_roles_legacy as it's no longer needed in the new architecture
ALTER TABLE public.user_roles RENAME TO user_roles_legacy;