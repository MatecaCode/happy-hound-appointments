-- Staff Invite/Claim Flow Migration
-- Adds invite/claim timestamps and email confirmation linking for staff_profiles

-- 1) Columns for invite/claim stamps on staff_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='staff_profiles' AND column_name='claim_invited_at') THEN
    ALTER TABLE public.staff_profiles ADD COLUMN claim_invited_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='staff_profiles' AND column_name='claimed_at') THEN
    ALTER TABLE public.staff_profiles ADD COLUMN claimed_at timestamptz;
  END IF;

  -- ensure user_id column exists (uuid, FK to auth.users)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='staff_profiles' AND column_name='user_id') THEN
    ALTER TABLE public.staff_profiles ADD COLUMN user_id uuid;
  END IF;
END$$;

-- 2) FK to auth.users (safe if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.staff_profiles
      ADD CONSTRAINT staff_profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 3) Link on email_confirmed_at (mirror of client flow)
CREATE OR REPLACE FUNCTION public.link_staff_when_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email citext;
  v_user_id uuid;
BEGIN
  -- act only when confirmation is set
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_email := NEW.email::citext;
  v_user_id := NEW.id;

  -- Link staff profile(s) with matching email that are not yet linked
  UPDATE public.staff_profiles
     SET user_id = v_user_id,
         claimed_at = now()
   WHERE email::citext = v_email
     AND (user_id IS NULL OR user_id <> v_user_id);

  RETURN NEW;
END$$;

-- 4) Trigger after update of email_confirmed_at on auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_link_staff_on_email_confirmed'
  ) THEN
    CREATE TRIGGER trg_link_staff_on_email_confirmed
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.link_staff_when_email_confirmed();
  END IF;
END$$;
