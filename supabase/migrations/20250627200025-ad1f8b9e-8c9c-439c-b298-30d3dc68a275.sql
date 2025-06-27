
-- Add service_name column to service_resources table for easier debugging
ALTER TABLE public.service_resources 
ADD COLUMN service_name TEXT;

-- Populate the service_name column with data from services table
UPDATE public.service_resources 
SET service_name = services.name 
FROM public.services 
WHERE service_resources.service_id = services.id;

-- Create a function to automatically update service_name when service_id changes
CREATE OR REPLACE FUNCTION update_service_name()
RETURNS TRIGGER AS $$
BEGIN
    SELECT name INTO NEW.service_name 
    FROM public.services 
    WHERE id = NEW.service_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically populate service_name on insert/update
DROP TRIGGER IF EXISTS update_service_name_trigger ON public.service_resources;
CREATE TRIGGER update_service_name_trigger
    BEFORE INSERT OR UPDATE OF service_id ON public.service_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_service_name();
