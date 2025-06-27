
-- Fix the ambiguous column reference in create_booking_atomic function
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
BEGIN
  -- Get service duration
  SELECT COALESCE(duration_minutes, 30) INTO service_duration 
  FROM services WHERE id = _service_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'Invalid service_id: service not found';
  END IF;
  
  end_time := _time_slot + (service_duration || ' minutes')::INTERVAL;
  
  -- Check if service requires shower
  SELECT EXISTS(
    SELECT 1 FROM service_resources 
    WHERE service_id = _service_id AND resource_type = 'shower'
  ) INTO requires_shower;
  
  -- 1. Lock and validate provider availability
  IF array_length(_provider_ids, 1) > 0 THEN
    FOREACH current_provider_id IN ARRAY _provider_ids LOOP
      -- Lock provider rows to prevent double-booking
      IF NOT EXISTS (
        SELECT 1 FROM provider_availability pa
        WHERE pa.provider_id = current_provider_id 
          AND pa.date = _booking_date 
          AND pa.time_slot >= _time_slot 
          AND pa.time_slot < end_time
          AND pa.available = true
        FOR UPDATE NOWAIT
      ) THEN
        RAISE EXCEPTION 'Provider % not available for requested time', current_provider_id;
      END IF;
      
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
  
  -- 2. Lock and validate shower availability if required
  IF requires_shower THEN
    shower_capacity := get_shower_capacity(_booking_date);
    
    -- Lock ALL shower slots for the duration
    FOR shower_slot IN 
      SELECT * FROM shower_availability 
      WHERE date = _booking_date 
        AND time_slot >= _time_slot 
        AND time_slot < end_time
      FOR UPDATE NOWAIT
    LOOP
      IF shower_slot.available_spots <= 0 THEN
        RAISE EXCEPTION 'Shower capacity exceeded for time slot %', shower_slot.time_slot;
      END IF;
    END LOOP;
  END IF;
  
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
  
  -- 5. Update shower availability (decrement spots) if required
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
  
  RETURN appointment_id;
END;
$$;
