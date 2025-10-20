-- Add missing foreign key relationship between appointment_services and appointment_staff
-- This enables PostgREST to embed appointment_staff under appointment_services

-- Clean up duplicate appointment_services records first
-- Keep only the first record for each (appointment_id, service_id) pair
DELETE FROM public.appointment_services 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY appointment_id, service_id ORDER BY created_at) as rn
    FROM public.appointment_services
  ) t 
  WHERE rn > 1
);

-- Add unique constraint on appointment_services (appointment_id, service_id)
ALTER TABLE public.appointment_services
  ADD CONSTRAINT unique_appointment_service_id UNIQUE (appointment_id, service_id);

-- Ensure supporting indexes exist
CREATE INDEX IF NOT EXISTS idx_appointment_services_pk
  ON public.appointment_services (appointment_id, service_id);

CREATE INDEX IF NOT EXISTS idx_appointment_staff_appt_service
  ON public.appointment_staff (appointment_id, service_id);

-- Add composite FK that PostgREST will use for embedding
ALTER TABLE public.appointment_staff
  ADD CONSTRAINT appointment_staff_appointment_services_fk
  FOREIGN KEY (appointment_id, service_id)
  REFERENCES public.appointment_services (appointment_id, service_id)
  ON DELETE CASCADE;

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';
