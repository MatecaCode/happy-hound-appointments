-- Create new staff registration codes table for the new system
CREATE TABLE public.staff_registration_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL CHECK (account_type IN ('staff', 'admin')),
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.staff_registration_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for staff registration codes
CREATE POLICY "System can validate staff registration codes" 
ON public.staff_registration_codes 
FOR SELECT 
USING (true);

CREATE POLICY "System can update staff registration codes" 
ON public.staff_registration_codes 
FOR UPDATE 
USING (true);

-- Create function to validate staff registration codes
CREATE OR REPLACE FUNCTION public.validate_staff_registration_code(code_value text, account_type_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_registration_codes
    WHERE code = code_value
      AND account_type = account_type_value
      AND (is_used = FALSE OR is_used IS NULL)
  );
END;
$$;

-- Create function to mark staff code as used
CREATE OR REPLACE FUNCTION public.mark_staff_code_as_used(code_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.staff_registration_codes
  SET 
    is_used = TRUE,
    used_at = NOW(),
    used_by = auth.uid()
  WHERE code = code_value
    AND (is_used = FALSE OR is_used IS NULL);
END;
$$;

-- Insert some sample codes for testing
INSERT INTO public.staff_registration_codes (code, account_type, notes) VALUES
('STAFF-001', 'staff', 'Staff registration code'),
('STAFF-002', 'staff', 'Staff registration code'),
('STAFF-003', 'staff', 'Staff registration code'),
('ADMIN-001', 'admin', 'Admin registration code'),
('ADMIN-002', 'admin', 'Admin registration code');