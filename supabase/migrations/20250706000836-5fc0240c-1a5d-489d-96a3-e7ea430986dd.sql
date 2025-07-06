
-- Create a breeds table for predefined breed options
CREATE TABLE public.breeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  size_category TEXT CHECK (size_category IN ('small', 'medium', 'large', 'extra_large')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert common dog breeds with size categories
INSERT INTO public.breeds (name, size_category) VALUES
  ('Labrador Retriever', 'large'),
  ('Golden Retriever', 'large'),
  ('Pastor Alemão', 'large'),
  ('Bulldog Francês', 'small'),
  ('Poodle Toy', 'small'),
  ('Poodle Médio', 'medium'),
  ('Poodle Standard', 'large'),
  ('Yorkshire Terrier', 'small'),
  ('Chihuahua', 'small'),
  ('Beagle', 'medium'),
  ('Border Collie', 'medium'),
  ('Cocker Spaniel', 'medium'),
  ('Dachshund (Salsicha)', 'small'),
  ('Shih Tzu', 'small'),
  ('Maltês', 'small'),
  ('Pug', 'small'),
  ('Boxer', 'large'),
  ('Rottweiler', 'large'),
  ('Husky Siberiano', 'large'),
  ('Schnauzer Miniatura', 'small'),
  ('Schnauzer Standard', 'medium'),
  ('Schnauzer Gigante', 'large'),
  ('Sem Raça Definida (SRD)', 'medium'),
  ('Outro', null);

-- Add RLS policies for breeds table
ALTER TABLE public.breeds ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read breeds (needed for dropdown)
CREATE POLICY "Anyone can view breeds" 
  ON public.breeds 
  FOR SELECT 
  USING (active = true);

-- Only admins can manage breeds
CREATE POLICY "Admins can manage breeds" 
  ON public.breeds 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::text));

-- Update pets table to reference breeds table
ALTER TABLE public.pets 
ADD COLUMN breed_id UUID REFERENCES public.breeds(id);

-- Migrate existing breed data (optional - you can run this if you have existing data)
-- UPDATE public.pets 
-- SET breed_id = (
--   SELECT id FROM public.breeds 
--   WHERE LOWER(name) = LOWER(pets.breed) 
--   LIMIT 1
-- ) 
-- WHERE breed IS NOT NULL;
