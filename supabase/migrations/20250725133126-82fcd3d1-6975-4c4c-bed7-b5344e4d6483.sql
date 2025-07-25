-- Create storage policies for staff photos
CREATE POLICY "Staff can upload their own photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'vettale' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'staff-photos'
);

CREATE POLICY "Staff can view their own photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'vettale' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'staff-photos'
);

CREATE POLICY "Staff can update their own photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'vettale' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'staff-photos'
);

CREATE POLICY "Staff can delete their own photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'vettale' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'staff-photos'
);

-- Allow public access to staff photos for viewing by clients
CREATE POLICY "Public can view staff photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'vettale' 
  AND (storage.foldername(name))[2] = 'staff-photos'
);