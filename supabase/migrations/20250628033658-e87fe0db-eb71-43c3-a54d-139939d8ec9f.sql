
-- First, let's check what constraint exists on the registration_codes table
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.registration_codes'::regclass 
AND conname LIKE '%role%';

-- Update the role constraint to include 'admin'
DO $$ 
BEGIN
    -- Drop the existing role constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.registration_codes'::regclass 
        AND conname LIKE '%role%'
    ) THEN
        ALTER TABLE public.registration_codes 
        DROP CONSTRAINT IF EXISTS registration_codes_role_check;
    END IF;
    
    -- Add the new constraint that includes 'admin'
    ALTER TABLE public.registration_codes 
    ADD CONSTRAINT registration_codes_role_check 
    CHECK (role IN ('admin', 'client', 'groomer', 'vet'));
END $$;

-- Delete any incorrectly inserted groomer codes
DELETE FROM public.registration_codes 
WHERE code IN ('ADMIN-001', 'ADMIN-002', 'ADMIN-003', 'ADMIN-004', 'ADMIN-005');

-- Insert proper admin registration codes
INSERT INTO public.registration_codes (code, role, is_used, created_at) VALUES
('ADMIN-001', 'admin', false, now()),
('ADMIN-002', 'admin', false, now()),
('ADMIN-003', 'admin', false, now()),
('ADMIN-004', 'admin', false, now()),
('ADMIN-005', 'admin', false, now());
