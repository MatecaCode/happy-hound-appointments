
-- Fix the get_available_slots_for_service function to use manual loops instead of generate_series
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
  check_minutes INTEGER;
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
  
  -- Generate all possible start times using manual loop (NOT generate_series)
  slot_minutes := 0;
  WHILE slot_minutes <= 480 LOOP -- From 09:00 to 16:30
    current_slot := ('09:00:00'::time + (slot_minutes || ' minutes')::interval)::time;
    end_time := current_slot + (service_duration || ' minutes')::INTERVAL;
    
    -- Skip if end time goes beyond business hours
    IF end_time > '17:00:00'::time THEN
      EXIT;
    END IF;
    
    all_slots_available := true;
    
    RAISE NOTICE '[GET_AVAILABLE_SLOTS] Testing slot: start=%, end=%', current_slot, end_time;
    
    -- Check ALL slots in service duration using manual loop
    check_minutes := 0;
    WHILE check_minutes < service_duration LOOP
      check_time := current_slot + (check_minutes || ' minutes')::interval;
      
      -- Check provider availability if required
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
      
      -- Check shower availability if required
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
      
      check_minutes := check_minutes + 30;
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

-- Fix the create_booking_atomic function to use manual loops instead of generate_series
CREATE OR REPLACE FUNCTION create_booking_atomic(
    _user_id UUID,
    _pet_id UUID,
    _service_id UUID,
    _provider_ids UUID[],
    _booking_date DATE,
    _time_slot TIME,
    _notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_appointment_id UUID;
    provider_id UUID;
    service_duration INTEGER;
    end_time TIME;
    shower_required BOOLEAN := FALSE;
    requires_provider BOOLEAN := FALSE;
    check_time TIME;
    check_minutes INTEGER;
BEGIN
    -- Enhanced logging for debugging
    RAISE NOTICE '[create_booking_atomic] CALLED with params: user_id=%, pet_id=%, service_id=%, provider_ids=%, booking_date=%, time_slot=%, notes=%', 
        _user_id, _pet_id, _service_id, _provider_ids, _booking_date, _time_slot, _notes;
    
    -- Log the time slot format specifically
    RAISE NOTICE '[create_booking_atomic] TIME SLOT VALIDATION: input=%, type=%, format_valid=%', 
        _time_slot, pg_typeof(_time_slot), (_time_slot IS NOT NULL);

    -- Validate required parameters
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;
    
    IF _pet_id IS NULL THEN
        RAISE EXCEPTION 'Pet ID is required';
    END IF;
    
    IF _service_id IS NULL THEN
        RAISE EXCEPTION 'Service ID is required';
    END IF;
    
    IF _booking_date IS NULL THEN
        RAISE EXCEPTION 'Booking date is required';
    END IF;
    
    IF _time_slot IS NULL THEN
        RAISE EXCEPTION 'Time slot is required';
    END IF;

    -- Get service details
    SELECT duration INTO service_duration 
    FROM services 
    WHERE id = _service_id;
    
    IF service_duration IS NULL THEN
        RAISE EXCEPTION 'Service not found or has no duration: %', _service_id;
    END IF;
    
    RAISE NOTICE '[create_booking_atomic] SERVICE DETAILS: duration=% minutes', service_duration;
    
    -- Calculate end time
    end_time := _time_slot + (service_duration || ' minutes')::INTERVAL;
    RAISE NOTICE '[create_booking_atomic] TIME CALCULATION: start_time=%, duration=% minutes, end_time=%', 
        _time_slot, service_duration, end_time;

    -- Check if service requires shower
    SELECT EXISTS(
        SELECT 1 FROM service_resources 
        WHERE service_id = _service_id AND resource_type = 'shower'
    ) INTO shower_required;
    
    -- Check if service requires provider
    SELECT EXISTS(
        SELECT 1 FROM service_resources 
        WHERE service_id = _service_id AND resource_type = 'provider'
    ) INTO requires_provider;
    
    RAISE NOTICE '[create_booking_atomic] REQUIREMENTS: shower=%, provider=%', shower_required, requires_provider;

    -- Validate provider availability if required
    IF requires_provider AND array_length(_provider_ids, 1) > 0 THEN
        FOREACH provider_id IN ARRAY _provider_ids LOOP
            RAISE NOTICE '[create_booking_atomic] VALIDATING PROVIDER AVAILABILITY: provider_id=%', provider_id;
            
            -- Check ALL slots in service duration using manual loop (NOT generate_series)
            check_minutes := 0;
            WHILE check_minutes < service_duration LOOP
                check_time := _time_slot + (check_minutes || ' minutes')::interval;
                
                IF NOT EXISTS(
                    SELECT 1 FROM provider_availability 
                    WHERE provider_id = provider_id 
                    AND date = _booking_date 
                    AND time_slot = check_time 
                    AND available = TRUE
                ) THEN
                    RAISE EXCEPTION 'Provider % not available for date % at time %', provider_id, _booking_date, check_time;
                END IF;
                
                check_minutes := check_minutes + 30;
            END LOOP;
            
            RAISE NOTICE '[create_booking_atomic] PROVIDER AVAILABILITY: CONFIRMED for provider_id=%', provider_id;
        END LOOP;
    END IF;

    -- If shower is required, validate shower availability
    IF shower_required THEN
        RAISE NOTICE '[create_booking_atomic] VALIDATING SHOWER AVAILABILITY for date=%, time=%', _booking_date, _time_slot;
        
        -- Check ALL slots in service duration using manual loop (NOT generate_series)
        check_minutes := 0;
        WHILE check_minutes < service_duration LOOP
            check_time := _time_slot + (check_minutes || ' minutes')::interval;
            
            IF NOT EXISTS(
                SELECT 1 FROM shower_availability 
                WHERE date = _booking_date 
                AND time_slot = check_time 
                AND available_spots > 0
            ) THEN
                RAISE EXCEPTION 'Shower not available for date % at time %', _booking_date, check_time;
            END IF;
            
            check_minutes := check_minutes + 30;
        END LOOP;
        
        RAISE NOTICE '[create_booking_atomic] SHOWER AVAILABILITY: CONFIRMED';
    END IF;

    -- Create the appointment
    INSERT INTO appointments (
        user_id, 
        pet_id, 
        service_id, 
        date, 
        time, 
        notes,
        status,
        service_status
    ) VALUES (
        _user_id, 
        _pet_id, 
        _service_id, 
        _booking_date, 
        _time_slot, 
        _notes,
        'pending',
        'not_started'
    ) RETURNING id INTO new_appointment_id;
    
    RAISE NOTICE '[create_booking_atomic] APPOINTMENT CREATED: id=%', new_appointment_id;

    -- Add provider associations if providers are specified
    IF requires_provider AND array_length(_provider_ids, 1) > 0 THEN
        FOREACH provider_id IN ARRAY _provider_ids LOOP
            INSERT INTO appointment_providers (appointment_id, provider_id, role)
            VALUES (new_appointment_id, provider_id, 'primary');
            
            RAISE NOTICE '[create_booking_atomic] PROVIDER LINKED: appointment_id=%, provider_id=%', new_appointment_id, provider_id;
        END LOOP;
    END IF;

    -- Update shower availability if required
    IF shower_required THEN
        -- Update ALL slots in service duration using manual loop (NOT generate_series)
        check_minutes := 0;
        WHILE check_minutes < service_duration LOOP
            check_time := _time_slot + (check_minutes || ' minutes')::interval;
            
            UPDATE shower_availability 
            SET available_spots = available_spots - 1
            WHERE date = _booking_date 
            AND time_slot = check_time;
            
            check_minutes := check_minutes + 30;
        END LOOP;
        
        RAISE NOTICE '[create_booking_atomic] SHOWER AVAILABILITY UPDATED: date=%, time=%', _booking_date, _time_slot;
    END IF;

    -- Update provider availability
    IF requires_provider AND array_length(_provider_ids, 1) > 0 THEN
        FOREACH provider_id IN ARRAY _provider_ids LOOP
            -- Update ALL slots in service duration using manual loop (NOT generate_series)
            check_minutes := 0;
            WHILE check_minutes < service_duration LOOP
                check_time := _time_slot + (check_minutes || ' minutes')::interval;
                
                UPDATE provider_availability 
                SET available = FALSE
                WHERE provider_id = provider_id 
                AND date = _booking_date 
                AND time_slot = check_time;
                
                check_minutes := check_minutes + 30;
            END LOOP;
            
            RAISE NOTICE '[create_booking_atomic] PROVIDER AVAILABILITY UPDATED: provider_id=%, date=%, time=%', provider_id, _booking_date, _time_slot;
        END LOOP;
    END IF;

    RAISE NOTICE '[create_booking_atomic] SUCCESS: appointment_id=%', new_appointment_id;
    RETURN new_appointment_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[create_booking_atomic] ERROR: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql;
