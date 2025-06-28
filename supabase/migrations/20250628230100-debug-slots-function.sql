
-- Add debug logging to get_available_slots_for_service to match create_booking_atomic logic
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
  debug_count INTEGER;
BEGIN
  RAISE NOTICE '[GET_AVAILABLE_SLOTS] === DEBUG START ===';
  RAISE NOTICE '[GET_AVAILABLE_SLOTS] Params: service_id=%, date=%, provider_id=%', 
    _service_id, _date, _provider_id;

  -- Get service duration and requirements
  SELECT COALESCE(duration_minutes, 30) INTO service_duration 
  FROM services WHERE id = _service_id;
  
  IF service_duration IS NULL THEN
    RAISE NOTICE '[GET_AVAILABLE_SLOTS] Service not found';
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
  
  RAISE NOTICE '[GET_AVAILABLE_SLOTS] Service analysis: duration=%min, requires_shower=%, requires_provider=%', 
    service_duration, requires_shower, requires_provider;
  
  -- Generate all possible start times using exact same logic as create_booking_atomic
  slot_minutes := 0;
  WHILE slot_minutes <= 480 LOOP
    current_slot := ('09:00:00'::time + (slot_minutes || ' minutes')::interval)::time;
    end_time := current_slot + (service_duration || ' minutes')::INTERVAL;
    
    -- Skip if end time goes beyond business hours
    IF end_time > '17:00:00'::time THEN
      EXIT;
    END IF;
    
    all_slots_available := true;
    
    RAISE NOTICE '[GET_AVAILABLE_SLOTS] Testing slot: start=%, end=%', current_slot, end_time;
    
    -- Use EXACT same slot checking logic as create_booking_atomic
    FOR check_time IN 
      SELECT generate_series(current_slot, end_time - '30 minutes'::interval, '30 minutes'::interval)::time
    LOOP
      -- Check provider availability if required (EXACT same logic)
      IF requires_provider AND _provider_id IS NOT NULL THEN
        SELECT COUNT(*) INTO debug_count
        FROM provider_availability pa
        WHERE pa.provider_id = _provider_id 
          AND pa.date = _date 
          AND pa.time_slot = check_time
          AND pa.available = true;
          
        RAISE NOTICE '[GET_AVAILABLE_SLOTS] Provider check: time=%, count=%', check_time, debug_count;
        
        IF debug_count = 0 THEN
          all_slots_available := false;
          RAISE NOTICE '[GET_AVAILABLE_SLOTS] Provider unavailable at %', check_time;
          EXIT;
        END IF;
      END IF;
      
      -- Check shower availability if required (EXACT same logic)
      IF requires_shower THEN
        SELECT COUNT(*) INTO debug_count
        FROM shower_availability sa
        WHERE sa.date = _date 
          AND sa.time_slot = check_time
          AND sa.available_spots > 0;
          
        RAISE NOTICE '[GET_AVAILABLE_SLOTS] Shower check: time=%, count=%', check_time, debug_count;
        
        IF debug_count = 0 THEN
          all_slots_available := false;
          RAISE NOTICE '[GET_AVAILABLE_SLOTS] Shower unavailable at %', check_time;
          EXIT;
        END IF;
      END IF;
    END LOOP;
    
    -- Return this slot if all duration slots are available
    IF all_slots_available THEN
      RAISE NOTICE '[GET_AVAILABLE_SLOTS] AVAILABLE SLOT: %', current_slot;
      time_slot := current_slot;
      RETURN NEXT;
    END IF;
    
    slot_minutes := slot_minutes + 30;
  END LOOP;
  
  RAISE NOTICE '[GET_AVAILABLE_SLOTS] === DEBUG END ===';
  RETURN;
END;
$$;
