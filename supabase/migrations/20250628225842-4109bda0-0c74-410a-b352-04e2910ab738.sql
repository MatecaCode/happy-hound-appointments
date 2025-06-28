
-- Fix the get_available_slots_for_service RPC to use proper time generation
CREATE OR REPLACE FUNCTION public.get_available_slots_for_service(
    _service_id uuid,
    _date date,
    _provider_id uuid DEFAULT NULL
)
RETURNS TABLE(time_slot time without time zone)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  service_duration INTEGER;
  end_time TIME;
  current_slot TIME;
  requires_shower BOOLEAN;
  requires_provider BOOLEAN;
  all_slots_available BOOLEAN;
  check_time TIME;
  slot_minutes INTEGER;
BEGIN
  -- Get service duration and requirements
  SELECT COALESCE(duration_minutes, 30) INTO service_duration 
  FROM services WHERE id = _service_id;
  
  IF service_duration IS NULL THEN
    RETURN;
  END IF;
  
  -- Check service requirements
  SELECT EXISTS(
    SELECT 1 FROM service_resources 
    WHERE service_id = _service_id AND resource_type = 'shower'
  ) INTO requires_shower;
  
  SELECT EXISTS(
    SELECT 1 FROM service_resources 
    WHERE service_id = _service_id AND resource_type = 'provider'
  ) INTO requires_provider;
  
  -- Generate all possible start times using a loop instead of generate_series
  slot_minutes := 0;
  WHILE slot_minutes <= 480 LOOP -- From 09:00 (540 minutes from midnight) to 16:30 (990 minutes)
    current_slot := ('09:00:00'::time + (slot_minutes || ' minutes')::interval)::time;
    end_time := current_slot + (service_duration || ' minutes')::INTERVAL;
    
    -- Skip if end time goes beyond business hours
    IF end_time > '17:00:00'::time THEN
      EXIT;
    END IF;
    
    all_slots_available := true;
    
    -- Check all slots in the duration range
    DECLARE
      check_minutes INTEGER := 0;
    BEGIN
      WHILE check_minutes < service_duration LOOP
        check_time := current_slot + (check_minutes || ' minutes')::interval;
        
        -- Check provider availability if required
        IF requires_provider AND _provider_id IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM provider_availability pa
            WHERE pa.provider_id = _provider_id 
              AND pa.date = _date 
              AND pa.time_slot = check_time
              AND pa.available = true
          ) THEN
            all_slots_available := false;
            EXIT;
          END IF;
        END IF;
        
        -- Check shower availability if required
        IF requires_shower THEN
          IF NOT EXISTS (
            SELECT 1 FROM shower_availability sa
            WHERE sa.date = _date 
              AND sa.time_slot = check_time
              AND sa.available_spots > 0
          ) THEN
            all_slots_available := false;
            EXIT;
          END IF;
        END IF;
        
        check_minutes := check_minutes + 30;
      END LOOP;
    END;
    
    -- Return this slot if all duration slots are available
    IF all_slots_available THEN
      time_slot := current_slot;
      RETURN NEXT;
    END IF;
    
    slot_minutes := slot_minutes + 30;
  END LOOP;
  
  RETURN;
END;
$$;
