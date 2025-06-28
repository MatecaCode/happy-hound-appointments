
-- First, let's see what roles are currently allowed
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'registration_codes' AND table_schema = 'public';

-- Check if there are any constraints on the role column
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.registration_codes'::regclass;

-- Add service_status column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN service_status text NOT NULL DEFAULT 'not_started';

-- Add constraint to ensure valid status values
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_service_status_check 
CHECK (service_status IN ('not_started', 'in_progress', 'completed'));

-- Insert admin registration codes with 'groomer' role first (we'll change this after seeing what's allowed)
INSERT INTO public.registration_codes (code, role, is_used, created_at) VALUES
('ADMIN-001', 'groomer', false, now()),
('ADMIN-002', 'groomer', false, now()),
('ADMIN-003', 'groomer', false, now()),
('ADMIN-004', 'groomer', false, now()),
('ADMIN-005', 'groomer', false, now());
