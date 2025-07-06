
-- Remove size_category from breeds table since it should be user-selected per pet
ALTER TABLE public.breeds DROP COLUMN IF EXISTS size_category;

-- Update the breeds table data to remove any size references from names if needed
-- and ensure we have clean breed names
UPDATE public.breeds SET name = 'Poodle' WHERE name IN ('Poodle Toy', 'Poodle Médio', 'Poodle Standard');
UPDATE public.breeds SET name = 'Schnauzer' WHERE name IN ('Schnauzer Miniatura', 'Schnauzer Standard', 'Schnauzer Gigante');

-- Remove duplicate entries that may have been created
DELETE FROM public.breeds WHERE id NOT IN (
  SELECT MIN(id) FROM public.breeds GROUP BY name
);

-- Ensure pets table has the size column for user selection
-- (This column should already exist, but making sure it's properly defined)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pets' AND column_name = 'size'
  ) THEN
    ALTER TABLE public.pets ADD COLUMN size TEXT;
  END IF;
END $$;

-- Add a check constraint to ensure valid size values
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_size_check;
ALTER TABLE public.pets ADD CONSTRAINT pets_size_check 
CHECK (size IN ('small', 'medium', 'large', 'extra_large') OR size IS NULL);
