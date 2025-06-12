
-- Drop all existing policies on provider_availability table first
DROP POLICY IF EXISTS "Users can view their own availability" ON public.provider_availability;
DROP POLICY IF EXISTS "Providers can view their own availability" ON public.provider_availability;
DROP POLICY IF EXISTS "Providers can insert their own availability" ON public.provider_availability;
DROP POLICY IF EXISTS "Providers can update their own availability" ON public.provider_availability;
DROP POLICY IF EXISTS "Authenticated users can view all provider availability" ON public.provider_availability;

-- Create a new SELECT policy that allows all authenticated users to view availability
CREATE POLICY "Authenticated users can view all provider availability" 
ON public.provider_availability 
FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Keep provider-specific policies for INSERT/UPDATE operations
-- This ensures providers can only modify their own availability
CREATE POLICY "Providers can insert their own availability" 
ON public.provider_availability 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groomers 
    WHERE id = provider_id AND user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.veterinarians 
    WHERE id = provider_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their own availability" 
ON public.provider_availability 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.groomers 
    WHERE id = provider_id AND user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.veterinarians 
    WHERE id = provider_id AND user_id = auth.uid()
  )
);
