-- Remove the legacy atomic_create_appointment function that uses shower_availability/provider_availability
DROP FUNCTION IF EXISTS public.atomic_create_appointment(uuid, uuid, uuid, uuid, date, time without time zone, text);

-- Also remove any other legacy booking functions that might reference old tables
DROP FUNCTION IF EXISTS public.atomic_create_appointment(uuid, uuid, uuid, uuid, date, time, text);

-- Verify our current function exists and is the only atomic booking function
-- (This is just for verification - the create_booking_atomic function should remain)