-- Update create_booking_atomic function to validate end times correctly
-- Weekdays: 09:00 - 16:00 (last slot at 16:00)
-- Saturdays: 09:00 - 12:00 (last slot at 12:00)

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
    new_appointment_id UUID;
    staff_id UUID;
    service_duration INTEGER;
    end_time TIME;
    check_time TIME;
    check_minutes INTEGER;
    client_id UUID;
    is_saturday BOOLEAN;
    max_end_time TIME;
BEGIN
    -- Enhanced logging for debugging
    RAISE NOTICE '[create_booking_atomic] CALLED with params: user_id=%, pet_id=%, service_id=%, provider_ids=%, booking_date=%, time_slot=%, notes=%', 
        _user_id, _pet_id, _service_id, _provider_ids, _booking_date, _time_slot, _notes;

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

    -- Get client_id from user_id
    SELECT c.id INTO client_id 
    FROM clients c 
    WHERE c.user_id = _user_id;
    
    IF client_id IS NULL THEN
        RAISE EXCEPTION 'Client record not found for user: %', _user_id;
    END IF;

    -- Get service duration (use default_duration, not duration_minutes)
    SELECT COALESCE(default_duration, 60) INTO service_duration 
    FROM services 
    WHERE id = _service_id;
    
    IF service_duration IS NULL THEN
        RAISE EXCEPTION 'Service not found: %', _service_id;
    END IF;
    
    RAISE NOTICE '[create_booking_atomic] SERVICE DETAILS: duration=% minutes', service_duration;
    
    -- Calculate end time
    end_time := _time_slot + (service_duration || ' minutes')::INTERVAL;
    RAISE NOTICE '[create_booking_atomic] TIME CALCULATION: start_time=%, duration=% minutes, end_time=%', 
        _time_slot, service_duration, end_time;

    -- Determine if it's Saturday and set max end time
    is_saturday := (EXTRACT(dow FROM _booking_date) = 6);
    IF is_saturday THEN
        max_end_time := '12:00:00'::time;
    ELSE
        max_end_time := '16:00:00'::time;
    END IF;

    -- Validate that the booking doesn't go beyond business hours
    IF end_time > max_end_time THEN
        RAISE EXCEPTION 'Booking would end at % which is beyond business hours (max: %)', end_time, max_end_time;
    END IF;

    -- Validate staff availability if staff are specified
    IF array_length(_provider_ids, 1) > 0 THEN
        FOREACH staff_id IN ARRAY _provider_ids LOOP
            RAISE NOTICE '[create_booking_atomic] VALIDATING STAFF AVAILABILITY: staff_id=%', staff_id;
            
            -- Check ALL 10-minute slots in service duration
            check_minutes := 0;
            WHILE check_minutes < service_duration LOOP
                check_time := _time_slot + (check_minutes || ' minutes')::interval;
                
                IF NOT EXISTS(
                    SELECT 1 FROM staff_availability sa
                    WHERE sa.staff_profile_id = staff_id 
                    AND sa.date = _booking_date 
                    AND sa.time_slot = check_time 
                    AND sa.available = TRUE
                ) THEN
                    RAISE EXCEPTION 'Staff % not available for date % at time %', staff_id, _booking_date, check_time;
                END IF;
                
                -- Use 10-minute increments for precise availability checking
                check_minutes := check_minutes + 10;
            END LOOP;
            
            RAISE NOTICE '[create_booking_atomic] STAFF AVAILABILITY: CONFIRMED for staff_id=%', staff_id;
        END LOOP;
    END IF;

    -- Create the appointment (using client_id instead of user_id)
    INSERT INTO appointments (
        client_id, 
        pet_id, 
        service_id, 
        date, 
        time, 
        notes,
        status,
        service_status
    ) VALUES (
        client_id, 
        _pet_id, 
        _service_id, 
        _booking_date, 
        _time_slot, 
        _notes,
        'pending',
        'not_started'
    ) RETURNING id INTO new_appointment_id;
    
    RAISE NOTICE '[create_booking_atomic] APPOINTMENT CREATED: id=%', new_appointment_id;

    -- Add staff associations if staff are specified
    IF array_length(_provider_ids, 1) > 0 THEN
        FOREACH staff_id IN ARRAY _provider_ids LOOP
            INSERT INTO appointment_staff (appointment_id, staff_profile_id, role)
            VALUES (new_appointment_id, staff_id, 'primary');
            
            RAISE NOTICE '[create_booking_atomic] STAFF LINKED: appointment_id=%, staff_id=%', new_appointment_id, staff_id;
        END LOOP;
    END IF;

    -- Block ALL 10-minute slots for the service duration
    IF array_length(_provider_ids, 1) > 0 THEN
        FOREACH staff_id IN ARRAY _provider_ids LOOP
            -- Block ALL 10-minute slots in service duration
            check_minutes := 0;
            WHILE check_minutes < service_duration LOOP
                check_time := _time_slot + (check_minutes || ' minutes')::interval;
                
                UPDATE staff_availability sa
                SET available = FALSE
                WHERE sa.staff_profile_id = staff_id 
                AND sa.date = _booking_date 
                AND sa.time_slot = check_time;
                
                RAISE NOTICE '[create_booking_atomic] BLOCKED SLOT: staff_id=%, date=%, time=%', staff_id, _booking_date, check_time;
                
                -- Use 10-minute increments for precise slot blocking
                check_minutes := check_minutes + 10;
            END LOOP;
            
            RAISE NOTICE '[create_booking_atomic] ALL SLOTS BLOCKED: staff_id=%, date=%, duration=%min', staff_id, _booking_date, service_duration;
        END LOOP;
    END IF;

    -- Log the event
    INSERT INTO appointment_events (appointment_id, event_type, notes)
    VALUES (new_appointment_id, 'created', 'Booking created via atomic function');

    -- Queue notifications
    INSERT INTO notification_queue (appointment_id, recipient_type, recipient_id, message_type, message)
    VALUES (new_appointment_id, 'user', _user_id, 'booking_created', 'Your booking has been created and is pending confirmation.');

    RAISE NOTICE '[create_booking_atomic] SUCCESS: appointment_id=%', new_appointment_id;
    RETURN new_appointment_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[create_booking_atomic] ERROR: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$; 