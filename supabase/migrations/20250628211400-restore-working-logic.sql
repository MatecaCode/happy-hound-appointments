
-- Restore the original working range-based logic with enhanced debugging
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
  availability_count INTEGER;
  shower_slots_count INTEGER;
BEGIN
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Starting with params: user_id=%, pet_id=%, service_id=%, provider_ids=%, date=%, time_slot=%', 
    _user_id, _pet_id, _service_id, _provider_ids, _booking_date, _time_slot;

  -- Get service duration
  SELECT COALESCE(duration_minutes, 30) INTO service_duration 
  FROM services WHERE id = _service_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'Invalid service_id: service not found';
  END IF;
  
  end_time := _time_slot + (service_duration || ' minutes')::INTERVAL;
  
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Service duration=% minutes, end_time=%', service_duration, end_time;
  
  -- Check if service requires shower
  SELECT EXISTS(
    SELECT 1 FROM service_resources 
    WHERE service_id = _service_id AND resource_type = 'shower'
  ) INTO requires_shower;
  
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Service requires_shower=%', requires_shower;
  
  -- 1. Lock and validate provider availability (ORIGINAL WORKING LOGIC)
  IF array_length(_provider_ids, 1) > 0 THEN
    FOREACH current_provider_id IN ARRAY _provider_ids LOOP
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Checking provider_id=%', current_provider_id;
      
      -- Count available slots in the required time range
      SELECT COUNT(*) INTO availability_count
      FROM provider_availability pa
      WHERE pa.provider_id = current_provider_id 
        AND pa.date = _booking_date 
        AND pa.time_slot >= _time_slot 
        AND pa.time_slot < end_time
        AND pa.available = true;
      
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Found % available slots in range % to %', 
        availability_count, _time_slot, end_time;
      
      -- RESTORE ORIGINAL LOGIC: Check if we have availability for the full duration
      IF NOT EXISTS (
        SELECT 1 FROM provider_availability pa
        WHERE pa.provider_id = current_provider_id 
          AND pa.date = _booking_date 
          AND pa.time_slot >= _time_slot 
          AND pa.time_slot < end_time
          AND pa.available = true
        FOR UPDATE NOWAIT
      ) THEN
        RAISE NOTICE '[CREATE_BOOKING_ATOMIC] FAILURE: Provider % not available in time range % to %', 
          current_provider_id, _time_slot, end_time;
        RAISE EXCEPTION 'Provider % not available for requested time', current_provider_id;
      END IF;
      
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Provider availability check PASSED for provider=%', current_provider_id;
      
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
  
  -- 2. Lock and validate shower availability if required (ORIGINAL WORKING LOGIC)
  IF requires_shower THEN
    RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Checking shower availability for time range % to %', _time_slot, end_time;
    shower_capacity := get_shower_capacity(_booking_date);
    
    -- Count shower slots in range
    SELECT COUNT(*) INTO shower_slots_count
    FROM shower_availability 
    WHERE date = _booking_date 
      AND time_slot >= _time_slot 
      AND time_slot < end_time;
    
    RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Found % shower slots in range, capacity=%', 
      shower_slots_count, shower_capacity;
    
    -- Lock ALL shower slots for the duration (ORIGINAL LOGIC)
    FOR shower_slot IN 
      SELECT * FROM shower_availability 
      WHERE date = _booking_date 
        AND time_slot >= _time_slot 
        AND time_slot < end_time
      FOR UPDATE NOWAIT
    LOOP
      RAISE NOTICE '[CREATE_BOOKING_ATOMIC] Checking shower slot time_slot=%, available_spots=%', 
        shower_slot.time_slot, shower_slot.available_spots;
      IF shower_slot.available_spots <= 0 THEN
        RAISE EXCEPTION 'Shower capacity exceeded for time slot %', shower_slot.time_slot;
      END IF;
    END LOOP;
  END IF;
  
  RAISE NOTICE '[CREATE_BOOKING_ATOMIC] All validations passed, creating appointment...';
  
  -- 3. Create appointment
  INSERT INTO appointments (id, user_id, pet_id, service_id, date, time, notes, status)
  VALUES (appointment_id, _user_id, _pet_id, _service_id, _booking_date, _time_slot, _notes, 'pending');
  
  -- 4. Link providers
  IF array_length(_provider_ids, 1) > 0 THEN
    FOREACH current_provider_id IN ARRAY _provider_ids LOOP
      INSERT INTO appointment_providers (appointment_id, provider_id)
      VALUES (appointment_id, current_provider_id);
    END LOOP;
  END IF;
  
  -- 5. Update shower availability (decrement spots) if required (ORIGINAL LOGIC)
  IF requires_shower THEN
    UPDATE shower_availability 
    SET available_spots = available_spots - 1
    WHERE date = _booking_date 
      AND time_slot >= _time_slot 
      AND time_slot < end_time;
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
