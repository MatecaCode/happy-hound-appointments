
-- Create new RPC to get available slots for a service with proper contiguous-slots logic
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
  
  -- Generate all possible start times and check if full duration is available
  FOR current_slot IN 
    SELECT generate_series('09:00:00'::time, '16:30:00'::time, '30 minutes'::interval)::time
  LOOP
    end_time := current_slot + (service_duration || ' minutes')::INTERVAL;
    
    -- Skip if end time goes beyond business hours
    IF end_time > '17:00:00'::time THEN
      CONTINUE;
    END IF;
    
    all_slots_available := true;
    
    -- Check all slots in the duration range
    FOR check_time IN 
      SELECT generate_series(current_slot, end_time - '30 minutes'::interval, '30 minutes'::interval)::time
    LOOP
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
    END LOOP;
    
    -- Return this slot if all duration slots are available
    IF all_slots_available THEN
      time_slot := current_slot;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Update create_booking_atomic to use exact slot validation
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
BEGIN
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Starting with params: user_id=%, pet_id=%, service_id=%, provider_ids=%, date=%, time_slot=%', 
    _user_id, _pet_id, _service_id, _provider_ids, _booking_date, _time_slot;

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
  
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Service requirements: shower=%, provider=%, duration=%min', 
    requires_shower, requires_provider, service_duration;
  
  -- 1. Validate provider availability if required (EXACT SLOT CHECK)
  IF requires_provider AND array_length(_provider_ids, 1) > 0 THEN
    FOREACH current_provider_id IN ARRAY _provider_ids LOOP
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Validating provider % for all slots in duration', current_provider_id;
      
      -- Check ALL slots in service duration
      FOR check_time IN 
        SELECT generate_series(_time_slot, end_time - '30 minutes'::interval, '30 minutes'::interval)::time
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM provider_availability pa
          WHERE pa.provider_id = current_provider_id 
            AND pa.date = _booking_date 
            AND pa.time_slot = check_time
            AND pa.available = true
          FOR UPDATE NOWAIT
        ) THEN
          RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Provider % unavailable at slot %', current_provider_id, check_time;
          RAISE EXCEPTION 'Provider % not available for requested time', current_provider_id;
        END IF;
      END LOOP;
      
      -- Check for existing appointments (overlay validation)
      IF EXISTS (
        SELECT 1 FROM appointments a
        JOIN appointment_providers ap ON a.id = ap.appointment_id
        JOIN services s ON a.service_id = s.id
        WHERE ap.provider_id = current_provider_id
          AND a.date = _booking_date
          AND a.status NOT IN ('cancelled', 'rejected')
          AND (a.time < end_time AND (a.time + (COALESCE(s.duration_minutes, 30) || ' minutes')::INTERVAL) > _time_slot)
      ) THEN
        RAISE EXCEPTION 'Provider % has conflicting appointment', current_provider_id;
      END IF;
    END LOOP;
  END IF;
  
  -- 2. Validate shower availability if required (EXACT SLOT CHECK)
  IF requires_shower THEN
    RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Validating shower availability for all slots in duration';
    
    -- Check ALL slots in service duration
    FOR check_time IN 
      SELECT generate_series(_time_slot, end_time - '30 minutes'::interval, '30 minutes'::interval)::time
    LOOP
      SELECT * INTO shower_slot FROM shower_availability 
      WHERE date = _booking_date 
        AND time_slot = check_time
      FOR UPDATE NOWAIT;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'No shower availability found for time slot %', check_time;
      END IF;
      
      IF shower_slot.available_spots <= 0 THEN
        RAISE EXCEPTION 'Shower capacity exceeded for time slot %', check_time;
      END IF;
    END LOOP;
  END IF;
  
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] All validations passed, creating appointment...';
  
  -- 3. Create appointment
  INSERT INTO appointments (id, user_id, pet_id, service_id, date, time, notes, status)
  VALUES (appointment_id, _user_id, _pet_id, _service_id, _booking_date, _time_slot, _notes, 'pending');
  
  -- 4. Link providers if required
  IF requires_provider AND array_length(_provider_ids, 1) > 0 THEN
    FOREACH current_provider_id IN ARRAY _provider_ids LOOP
      INSERT INTO appointment_providers (appointment_id, provider_id)
      VALUES (appointment_id, current_provider_id);
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
    END LOOP;
  END IF;
  
  -- 6. Log the event
  INSERT INTO appointment_events (appointment_id, event_type, notes)
  VALUES (appointment_id, 'created', 'Booking created via system');
  
  -- 7. Queue notifications
  INSERT INTO notification_queue (appointment_id, recipient_type, recipient_id, message_type, message)
  VALUES (appointment_id, 'user', _user_id, 'booking_created', 'Your booking has been created and is pending confirmation.');
  
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] SUCCESS: Appointment created with id=%', appointment_id;
  
  RETURN appointment_id;
END;
$$;
