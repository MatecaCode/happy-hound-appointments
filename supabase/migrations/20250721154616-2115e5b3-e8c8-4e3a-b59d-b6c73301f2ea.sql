-- Make location_id nullable in staff_profiles table since staff can work without a specific location
ALTER TABLE public.staff_profiles 
ALTER COLUMN location_id DROP NOT NULL;