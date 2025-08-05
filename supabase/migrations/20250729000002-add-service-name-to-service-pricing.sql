-- Add service_name column to service_pricing table
ALTER TABLE public.service_pricing 
ADD COLUMN service_name text;

-- Update service_name based on service_id
UPDATE public.service_pricing 
SET service_name = (
  SELECT name 
  FROM public.services 
  WHERE services.id = service_pricing.service_id
);

-- Make service_name NOT NULL after populating
ALTER TABLE public.service_pricing 
ALTER COLUMN service_name SET NOT NULL;

-- Add index for better performance
CREATE INDEX idx_service_pricing_service_name ON public.service_pricing(service_name);

-- Add comment for documentation
COMMENT ON COLUMN public.service_pricing.service_name IS 'Name of the service for easier identification in the pricing table'; 