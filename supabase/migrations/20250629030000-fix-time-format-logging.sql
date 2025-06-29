
-- Fix time formatting issue and add enhanced logging
-- This migration enhances the create_booking_atomic RPC with better time validation and logging

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
    
    RAISE NOTICE '[create_booking_atomic] SHOWER CHECK: required=%', shower_required;

    -- If shower is required, validate shower availability
    IF shower_required THEN
        RAISE NOTICE '[create_booking_atomic] VALIDATING SHOWER AVAILABILITY for date=%, time=%', _booking_date, _time_slot;
        
        IF NOT EXISTS(
            SELECT 1 FROM shower_availability 
            WHERE date = _booking_date 
            AND time_slot = _time_slot 
            AND available_spots > 0
        ) THEN
            RAISE EXCEPTION 'Shower not available for date % at time %', _booking_date, _time_slot;
        END IF;
        
        RAISE NOTICE '[create_booking_atomic] SHOWER AVAILABILITY: CONFIRMED';
    END IF;

    -- Validate provider availability if providers are specified
    IF array_length(_provider_ids, 1) > 0 THEN
        FOREACH provider_id IN ARRAY _provider_ids LOOP
            RAISE NOTICE '[create_booking_atomic] VALIDATING PROVIDER AVAILABILITY: provider_id=%', provider_id;
            
            IF NOT EXISTS(
                SELECT 1 FROM provider_availability 
                WHERE provider_id = provider_id 
                AND date = _booking_date 
                AND time_slot = _time_slot 
                AND available = TRUE
            ) THEN
                RAISE EXCEPTION 'Provider % not available for date % at time %', provider_id, _booking_date, _time_slot;
            END IF;
            
            RAISE NOTICE '[create_booking_atomic] PROVIDER AVAILABILITY: CONFIRMED for provider_id=%', provider_id;
        END LOOP;
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
    IF array_length(_provider_ids, 1) > 0 THEN
        FOREACH provider_id IN ARRAY _provider_ids LOOP
            INSERT INTO appointment_providers (appointment_id, provider_id, role)
            VALUES (new_appointment_id, provider_id, 'primary');
            
            RAISE NOTICE '[create_booking_atomic] PROVIDER LINKED: appointment_id=%, provider_id=%', new_appointment_id, provider_id;
        END LOOP;
    END IF;

    -- Update shower availability if required
    IF shower_required THEN
        UPDATE shower_availability 
        SET available_spots = available_spots - 1
        WHERE date = _booking_date 
        AND time_slot = _time_slot;
        
        RAISE NOTICE '[create_booking_atomic] SHOWER AVAILABILITY UPDATED: date=%, time=%', _booking_date, _time_slot;
    END IF;

    -- Update provider availability
    IF array_length(_provider_ids, 1) > 0 THEN
        FOREACH provider_id IN ARRAY _provider_ids LOOP
            UPDATE provider_availability 
            SET available = FALSE
            WHERE provider_id = provider_id 
            AND date = _booking_date 
            AND time_slot = _time_slot;
            
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
