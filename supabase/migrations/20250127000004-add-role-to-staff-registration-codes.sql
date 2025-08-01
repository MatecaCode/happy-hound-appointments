-- Add role column to staff_registration_codes if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_registration_codes' 
    AND column_name = 'role'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.staff_registration_codes ADD COLUMN role text CHECK (role IN ('admin', 'staff'));
  END IF;
END $$;

-- Update existing codes to have appropriate roles based on account_type
UPDATE public.staff_registration_codes 
SET role = CASE 
  WHEN account_type = 'admin' THEN 'admin'
  WHEN account_type = 'staff' THEN 'staff'
  ELSE 'staff' -- Default fallback
END
WHERE role IS NULL; 