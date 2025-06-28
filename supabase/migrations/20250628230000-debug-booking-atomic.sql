
-- Add comprehensive debug logging to create_booking_atomic function
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
    _user_id uuid,
    _pet_id uuid,
    _service_id uuid,
    _provider_ids uuid[],
    _booking_date date,
    _time_slot time without time zone,
    _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  appointment_id UUID := gen_random_uuid();
  service_duration INTEGER;
  end_time TIME;
  shower_capacity INTEGER;
  current_provider_id UUID;
  shower_slot RECORD;
  requires_shower BOOLEAN;
  requires_provider BOOLEAN;
  check_time TIME;
  debug_count INTEGER;
  debug_availability RECORD;
BEGIN
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] === COMPREHENSIVE DEBUG START ===';
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Params: user_id=%, pet_id=%, service_id=%, provider_ids=%, date=%, time_slot=%, notes=%', 
    _user_id, _pet_id, _service_id, _provider_ids, _booking_date, _time_slot, _notes;

  -- Get service duration and requirements
  SELECT COALESCE(duration_minutes, 30) INTO service_duration 
  FROM services WHERE id = _service_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'Invalid service_id: service not found';
  END IF;
  
  end_time := _time_slot + (service_duration || ' minutes')::INTERVAL;
  
  -- Check service requirements
  SELECT EXISTS(
    SELECT 1 FROM service_resources 
    WHERE service_id = _service_id AND resource_type = 'shower'
  ) INTO requires_shower;
  
  SELECT EXISTS(
    SELECT 1 FROM service_resources 
    WHERE service_id = _service_id AND resource_type = 'provider'
  ) INTO requires_provider;
  
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Service analysis: duration=%min, end_time=%, requires_shower=%, requires_provider=%', 
    service_duration, end_time, requires_shower, requires_provider;
  
  -- 1. DETAILED PROVIDER AVAILABILITY DEBUGGING
  IF requires_provider AND array_length(_provider_ids, 1) > 0 THEN
    FOREACH current_provider_id IN ARRAY _provider_ids LOOP
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] === PROVIDER DEBUG for % ===', current_provider_id;
      
      -- Show ALL availability records for this provider on this date
      FOR debug_availability IN 
        SELECT time_slot, available FROM provider_availability 
        WHERE provider_id = current_provider_id AND date = _booking_date 
        ORDER BY time_slot 
      LOOP
        RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Provider % availability: time_slot=%, available=%', 
          current_provider_id, debug_availability.time_slot, debug_availability.available;
      END LOOP;
      
      -- Check each required slot individually
      FOR check_time IN 
        SELECT generate_series(_time_slot, end_time - '30 minutes'::interval, '30 minutes'::interval)::time
      LOOP
        SELECT COUNT(*) INTO debug_count
        FROM provider_availability pa
        WHERE pa.provider_id = current_provider_id 
          AND pa.date = _booking_date 
          AND pa.time_slot = check_time
          AND pa.available = true;
          
        RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Slot check: provider=%, time=%, count_available=%', 
          current_provider_id, check_time, debug_count;
        
        IF debug_count = 0 THEN
          RAISE NOTICE '[CREATE_BOOKING_ATOMIC] FAILURE: Provider % unavailable at slot %', current_provider_id, check_time;
          RAISE EXCEPTION 'Provider % not available for requested time', current_provider_id;
        END IF;
      END LOOP;
      
      -- Check for existing appointments (overlay validation)
      SELECT COUNT(*) INTO debug_count
      FROM appointments a
      JOIN appointment_providers ap ON a.id = ap.appointment_id
      JOIN services s ON a.service_id = s.id
      WHERE ap.provider_id = current_provider_id
        AND a.date = _booking_date
        AND a.status NOT IN ('cancelled', 'rejected')
        AND (a.time < end_time AND (a.time + (COALESCE(s.duration_minutes, 30) || ' minutes')::INTERVAL) > _time_slot);
        
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Conflict check: provider=%, conflicting_appointments=%', 
        current_provider_id, debug_count;
      
      IF debug_count > 0 THEN
        RAISE EXCEPTION 'Provider % has conflicting appointment', current_provider_id;
      END IF;
      
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Provider % validation PASSED', current_provider_id;
    END LOOP;
  END IF;
  
  -- 2. DETAILED SHOWER AVAILABILITY DEBUGGING
  IF requires_shower THEN
    RAISE NOTICE '[CREATE_BOOKING_ATOMIC] === SHOWER DEBUG ===';
    
    -- Show ALL shower availability for this date
    FOR debug_availability IN 
      SELECT time_slot, available_spots FROM shower_availability 
      WHERE date = _booking_date 
      ORDER BY time_slot 
    LOOP
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Shower availability: time_slot=%, available_spots=%', 
        debug_availability.time_slot, debug_availability.available_spots;
    END LOOP;
    
    -- Check each required slot individually
    FOR check_time IN 
      SELECT generate_series(_time_slot, end_time - '30 minutes'::interval, '30 minutes'::interval)::time
    LOOP
      SELECT * INTO shower_slot FROM shower_availability 
      WHERE date = _booking_date 
        AND time_slot = check_time
      FOR UPDATE NOWAIT;
      
      IF NOT FOUND THEN
        RAISE NOTICE '[CREATE_BOOKING_ATOMIC] FAILURE: No shower availability record for time slot %', check_time;
        RAISE EXCEPTION 'No shower availability found for time slot %', check_time;
      END IF;
      
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Shower slot check: time=%, available_spots=%', 
        check_time, shower_slot.available_spots;
      
      IF shower_slot.available_spots <= 0 THEN
        RAISE NOTICE '[CREATE_BOOKING_ATOMIC] FAILURE: Shower capacity exceeded for time slot %', check_time;
        RAISE EXCEPTION 'Shower capacity exceeded for time slot %', check_time;
      END IF;
    END LOOP;
    
    RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Shower validation PASSED';
  END IF;
  
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] === ALL VALIDATIONS PASSED - CREATING APPOINTMENT ===';
  
  -- 3. Create appointment
  INSERT INTO appointments (id, user_id, pet_id, service_id, date, time, notes, status)
  VALUES (appointment_id, _user_id, _pet_id, _service_id, _booking_date, _time_slot, _notes, 'pending');
  
  -- 4. Link providers if required
  IF requires_provider AND array_length(_provider_ids, 1) > 0 THEN
    FOREACH current_provider_id IN ARRAY _provider_ids LOOP
      INSERT INTO appointment_providers (appointment_id, provider_id)
      VALUES (appointment_id, current_provider_id);
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Linked provider % to appointment %', current_provider_id, appointment_id;
    END LOOP;
  END IF;
  
  -- 5. Update shower availability (decrement spots) if required
  IF requires_shower THEN
    FOR check_time IN 
      SELECT generate_series(_time_slot, end_time - '30 minutes'::interval, '30 minutes'::interval)::time
    LOOP
      UPDATE shower_availability 
      SET available_spots = available_spots - 1
      WHERE date = _booking_date 
        AND time_slot = check_time;
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Decremented shower slot % by 1', check_time;
    END LOOP;
  END IF;
  
  -- 6. Log the event
  INSERT INTO appointment_events (appointment_id, event_type, notes)
  VALUES (appointment_id, 'created', 'Booking created via system');
  
  -- 7. Queue notifications
  INSERT INTO notification_queue (appointment_id, recipient_type, recipient_id, message_type, message)
  VALUES (appointment_id, 'user', _user_id, 'booking_created', 'Your booking has been created and is pending confirmation.');
  
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] SUCCESS: Appointment created with id=%', appointment_id;
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] === DEBUG END ===';
  
  RETURN appointment_id;
END;
$$;
