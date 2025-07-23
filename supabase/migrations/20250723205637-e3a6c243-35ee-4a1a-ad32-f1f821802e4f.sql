-- Update generate_time_slots function to create 10-minute intervals
CREATE OR REPLACE FUNCTION public.generate_time_slots()
RETURNS TABLE(time_slot time without time zone)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH time_series AS (
    SELECT ('09:00:00'::time + (interval '10 minutes' * generate_series(0, 47))) AS slot_time
  )
  SELECT slot_time::time 
  FROM time_series 
  WHERE slot_time < '17:00:00'::time;
END;
$function$;