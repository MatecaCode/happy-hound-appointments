-- Purpose: Expose available staff for client booking without relaxing table RLS
-- Read-only RPC with SECURITY DEFINER returning only non-sensitive fields

CREATE OR REPLACE FUNCTION public.get_available_staff_public()
RETURNS TABLE (
  id uuid,
  name text,
  can_bathe boolean,
  can_groom boolean,
  can_vet boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.id, sp.name, sp.can_bathe, sp.can_groom, sp.can_vet
  FROM public.staff_profiles sp
  WHERE sp.active = true
    AND sp.user_id NOT IN (
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_available_staff_public() TO authenticated;

-- Make sure PostgREST becomes aware of this function without manual intervention
NOTIFY pgrst, 'reload schema';


