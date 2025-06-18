
-- First, let's add proper RLS policies for provider_availability table
-- Allow providers to view their own availability
CREATE POLICY "Providers can view their own availability" 
ON public.provider_availability 
FOR SELECT 
USING (
  provider_id IN (
    SELECT id FROM public.provider_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow providers to insert their own availability
CREATE POLICY "Providers can create their own availability" 
ON public.provider_availability 
FOR INSERT 
WITH CHECK (
  provider_id IN (
    SELECT id FROM public.provider_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow providers to update their own availability
CREATE POLICY "Providers can update their own availability" 
ON public.provider_availability 
FOR UPDATE 
USING (
  provider_id IN (
    SELECT id FROM public.provider_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow providers to delete their own availability
CREATE POLICY "Providers can delete their own availability" 
ON public.provider_availability 
FOR DELETE 
USING (
  provider_id IN (
    SELECT id FROM public.provider_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Enable RLS on provider_availability table if not already enabled
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

-- Also add RLS policies for shower_availability (needed for groomers)
-- Allow everyone to view shower availability (public information)
CREATE POLICY "Everyone can view shower availability" 
ON public.shower_availability 
FOR SELECT 
TO public 
USING (true);

-- Allow authenticated users to update shower availability (for booking system)
CREATE POLICY "Authenticated users can update shower availability" 
ON public.shower_availability 
FOR UPDATE 
TO authenticated 
USING (true);

-- Enable RLS on shower_availability table if not already enabled
ALTER TABLE public.shower_availability ENABLE ROW LEVEL SECURITY;

-- Now let's manually trigger availability generation for existing provider profiles
-- that don't have full 90-day availability
DO $$
DECLARE
    provider_record record;
    current_availability_count integer;
BEGIN
    FOR provider_record IN 
        SELECT id, type, user_id FROM public.provider_profiles 
    LOOP
        -- Check how many days of availability this provider has
        SELECT COUNT(DISTINCT date) INTO current_availability_count
        FROM public.provider_availability 
        WHERE provider_id = provider_record.id;
        
        -- If less than 80 days (allowing some buffer), regenerate full availability
        IF current_availability_count < 80 THEN
            -- Delete existing availability for clean regeneration
            DELETE FROM public.provider_availability 
            WHERE provider_id = provider_record.id;
            
            -- Generate 90 days of availability
            PERFORM public.ensure_provider_availability(
                provider_record.id, 
                CURRENT_DATE, 
                (CURRENT_DATE + interval '90 days')::date
            );
            
            -- Also ensure shower availability exists (for groomers)
            IF provider_record.type = 'groomer' THEN
                PERFORM public.ensure_shower_availability(
                    CURRENT_DATE, 
                    (CURRENT_DATE + interval '90 days')::date
                );
            END IF;
            
            RAISE NOTICE 'Regenerated availability for provider % (type: %)', 
                provider_record.id, provider_record.type;
        END IF;
    END LOOP;
END $$;
