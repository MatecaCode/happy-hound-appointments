-- Fix the ambiguous column reference in ensure_staff_availability function
CREATE OR REPLACE FUNCTION public.ensure_staff_availability(p_staff_profile_id uuid, start_date date, end_date date)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  curr_date date;
  slot_time time;
  slots_created integer := 0;
BEGIN
  RAISE NOTICE 'Generating staff availability for staff % from % to %', 
    p_staff_profile_id, start_date, end_date;
  
  curr_date := start_date;
  WHILE curr_date <= end_date LOOP
    -- Skip Sundays (dow = 0)
    IF EXTRACT(dow FROM curr_date) != 0 THEN
      FOR slot_time IN SELECT time_slot FROM public.generate_time_slots() LOOP
        INSERT INTO public.staff_availability (staff_profile_id, date, time_slot, available)
        VALUES (p_staff_profile_id, curr_date, slot_time, true)
        ON CONFLICT (staff_profile_id, date, time_slot) DO NOTHING;
        
        IF FOUND THEN
          slots_created := slots_created + 1;
        END IF;
      END LOOP;
    END IF;
    curr_date := curr_date + interval '1 day';
  END LOOP;
  
  RAISE NOTICE 'Created % availability slots for staff %', slots_created, p_staff_profile_id;
END;
$function$;