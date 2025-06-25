
-- 🔧 COMPREHENSIVE DEBUGGING SCRIPT FOR AVAILABILITY SYSTEM
-- Run these queries one by one to diagnose the issue

-- 1️⃣ Test the ensure_provider_availability function with correct parameters
-- Replace 'your-provider-id' with actual provider ID from your database
SELECT public.ensure_provider_availability(
  'b13fb65b-2337-4539-aed0-52e29467b79c'::uuid,
  CURRENT_DATE,
  (CURRENT_DATE + interval '90 days')::date
);

-- 2️⃣ Check if the trigger exists and is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_provider_profile_created';

-- 3️⃣ Verify trigger function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'handle_new_provider_profile';

-- 4️⃣ Check current provider profiles (get actual UUIDs to test with)
SELECT 
  id,
  user_id,
  type,
  created_at
FROM provider_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 5️⃣ Check availability for the provider ID you're testing
SELECT 
  provider_id,
  COUNT(*) as total_slots,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  COUNT(DISTINCT date) as unique_days
FROM provider_availability 
WHERE provider_id = 'b13fb65b-2337-4539-aed0-52e29467b79c'::uuid
GROUP BY provider_id;

-- 6️⃣ Check shower availability status
SELECT 
  COUNT(*) as total_shower_slots,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  COUNT(DISTINCT date) as unique_days
FROM shower_availability;

-- 7️⃣ Test shower availability generation
SELECT public.ensure_shower_availability(
  CURRENT_DATE,
  (CURRENT_DATE + interval '90 days')::date
);

-- 8️⃣ Check if generate_time_slots function works
SELECT COUNT(*) as time_slots_count 
FROM public.generate_time_slots();

-- 9️⃣ Test manual trigger execution (replace with actual provider ID)
DO $$
DECLARE
  test_provider_id uuid := 'b13fb65b-2337-4539-aed0-52e29467b79c';
BEGIN
  RAISE NOTICE 'Testing manual trigger execution for provider %', test_provider_id;
  
  -- Simulate the trigger
  PERFORM public.ensure_provider_availability(
    test_provider_id,
    CURRENT_DATE,
    (CURRENT_DATE + interval '90 days')::date
  );
  
  PERFORM public.ensure_shower_availability(
    CURRENT_DATE,
    (CURRENT_DATE + interval '90 days')::date
  );
  
  RAISE NOTICE 'Manual trigger test completed';
END $$;

-- 🔟 Final verification - check results after manual test
SELECT 
  'Provider Availability' as type,
  COUNT(*) as slots,
  MIN(date) as min_date,
  MAX(date) as max_date
FROM provider_availability 
WHERE provider_id = 'b13fb65b-2337-4539-aed0-52e29467b79c'::uuid

UNION ALL

SELECT 
  'Shower Availability' as type,
  COUNT(*) as slots,
  MIN(date) as min_date,
  MAX(date) as max_date
FROM shower_availability;
