-- Fix TOSA services to properly require grooming
UPDATE services 
SET requires_grooming = true 
WHERE name IN ('Tosa', 'Tosa Grande', 'Tosa na Tesoura') 
AND requires_grooming = false;

-- Add comment for documentation
COMMENT ON COLUMN services.requires_grooming IS 'Whether this service requires a groomer (tosador)'; 