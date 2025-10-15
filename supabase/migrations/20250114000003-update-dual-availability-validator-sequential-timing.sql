-- Update check_dual_staff_availability_for_edit function to use proper sequential timing
-- This migration replaces the existing function with improved sequential validation logic

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.check_dual_staff_availability_for_edit(uuid, date, time, integer);

-- Recreate with the fixed sequential timing logic
-- (The function definition is already in the migration file 20250114000001-create-check-dual-staff-availability-for-edit.sql)
-- This migration ensures the function is updated with the latest sequential timing fixes

-- Add a comment to track this update
COMMENT ON FUNCTION public.check_dual_staff_availability_for_edit IS 
'Validates staff availability for editing dual-service appointments with proper sequential timing. Updated to use services.default_duration and sequential staff validation (primary then secondary with offset).';
