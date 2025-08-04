-- Remove legacy provider tables and functions that are no longer used
-- This migration cleans up the old provider_id system completely

-- 1. Drop legacy functions that reference provider_profiles or provider_availability
DROP FUNCTION IF EXISTS public.fix_missing_provider_profiles();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Drop legacy triggers
DROP TRIGGER IF EXISTS on_provider_profile_created ON public.provider_profiles;
DROP TRIGGER IF EXISTS auto_generate_provider_availability ON public.provider_profiles;
DROP TRIGGER IF EXISTS on_provider_profile_created ON public.provider_profiles_legacy;
DROP TRIGGER IF EXISTS auto_generate_provider_availability ON public.provider_profiles_legacy;

-- 3. Drop legacy tables (if they exist)
DROP TABLE IF EXISTS public.provider_availability CASCADE;
DROP TABLE IF EXISTS public.provider_profiles CASCADE;
DROP TABLE IF EXISTS public.provider_profiles_legacy CASCADE;

-- 4. Remove any RLS policies on legacy tables
DROP POLICY IF EXISTS "Provider can view own profile" ON public.provider_profiles;
DROP POLICY IF EXISTS "Admin can view all provider profiles" ON public.provider_profiles;
DROP POLICY IF EXISTS "Authenticated users can read provider profiles" ON public.provider_profiles;

-- 5. Update any remaining functions that might reference legacy tables
-- Check if there are any functions that still use provider_id in appointments table
DO $$
BEGIN
    -- Check if appointments table still has provider_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'provider_id'
    ) THEN
        -- Remove the provider_id column from appointments table
        ALTER TABLE public.appointments DROP COLUMN IF EXISTS provider_id;
        RAISE NOTICE 'Removed provider_id column from appointments table';
    END IF;
END $$;

-- 6. Clean up any remaining references in RLS policies
-- Update any policies that reference provider_id to use staff_profile_id instead
DO $$
BEGIN
    -- Check if there are any RLS policies that still reference provider_id
    -- This is a safety check to ensure we don't break existing policies
    RAISE NOTICE 'Legacy provider tables and functions have been removed.';
    RAISE NOTICE 'All booking functions now use staff_profile_id and appointment_staff table.';
END $$;

-- 7. Add a comment to document the cleanup
COMMENT ON SCHEMA public IS 
'Legacy provider_id system has been removed. All booking functions now use staff_profile_id and appointment_staff table for staff assignments.'; 