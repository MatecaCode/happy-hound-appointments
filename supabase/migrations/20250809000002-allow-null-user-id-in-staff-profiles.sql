-- Allow admin to pre-create staff_profiles without an auth user yet
-- This enables later email-based claim linking user_id via RPC/trigger.

DO $$
BEGIN
  -- Only drop NOT NULL if it exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'staff_profiles' 
      AND column_name = 'user_id' 
      AND is_nullable = 'NO'
  ) THEN
    EXECUTE 'ALTER TABLE public.staff_profiles ALTER COLUMN user_id DROP NOT NULL';
  END IF;
END $$;

-- Keep existing unique constraint on user_id (allows multiple NULLs, which is fine for pre-created staff)
-- No further changes required.


