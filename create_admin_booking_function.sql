-- Create dedicated admin booking function
-- Run this in your Supabase SQL editor

CREATE OR REPLACE FUNCTION public.create_booking_admin(
    _client_id uuid,
    _pet_id uuid,
    _service_id uuid,
    _staff_profile_ids uuid[],
    _booking_date date,
    _time_slot time without time zone,
    _notes text DEFAULT NULL,
    _is_override boolean DEFAULT FALSE
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    new_appointment_id UUID;
    staff_id UUID;
    service_duration INTEGER;
    end_time TIME;
    check_time TIME;
    check_minutes INTEGER;
    user_id UUID;
    existing_appointment_id UUID;
    result json;
BEGIN
    -- Enhanced logging for debugging
    RAISE NOTICE '[create_booking_admin] CALLED with params: client_id=%, pet_id=%, service_id=%, staff_profile_ids=%, booking_date=%, time_slot=%, notes=%, is_override=%', 
        _client_id, _pet_id, _service_id, _staff_profile_ids, _booking_date, _time_slot, _notes, _is_override;

    -- Validate required parameters
    IF _client_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'CLIENT_ID_REQUIRED', 'message', 'Client ID is required');
    END IF;
    
    IF _pet_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'PET_ID_REQUIRED', 'message', 'Pet ID is required');
    END IF;
    
    IF _service_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'SERVICE_ID_REQUIRED', 'message', 'Service ID is required');
    END IF;
    
    IF _booking_date IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'BOOKING_DATE_REQUIRED', 'message', 'Booking date is required');
    END IF;
    
    IF _time_slot IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'TIME_SLOT_REQUIRED', 'message', 'Time slot is required');
    END IF;

    -- Get user_id from client_id
    SELECT c.user_id INTO user_id 
    FROM clients c 
    WHERE c.id = _client_id;
    
    IF user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'CLIENT_NOT_FOUND', 'message', 'Client record not found');
    END IF;

    -- Get service duration
    SELECT COALESCE(default_duration, 60) INTO service_duration 
    FROM services 
    WHERE id = _service_id;
    
    IF service_duration IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'SERVICE_NOT_FOUND', 'message', 'Service not found');
    END IF;
    
    RAISE NOTICE '[create_booking_admin] SERVICE DETAILS: duration=% minutes', service_duration;
    
    -- Calculate end time
    end_time := _time_slot + (service_duration || ' minutes')::INTERVAL;
    RAISE NOTICE '[create_booking_admin] TIME CALCULATION: start_time=%, duration=% minutes, end_time=%', 
        _time_slot, service_duration, end_time;

    -- For override bookings, check if there's an existing appointment to override
    IF _is_override THEN
        SELECT id INTO existing_appointment_id
        FROM appointments a
        JOIN appointment_staff ast ON a.id = ast.appointment_id
        WHERE a.date = _booking_date 
        AND a.time = _time_slot
        AND ast.staff_profile_id = ANY(_staff_profile_ids)
        AND a.status != 'cancelled'
        LIMIT 1;
        
        IF existing_appointment_id IS NOT NULL THEN
            RAISE NOTICE '[create_booking_admin] OVERRIDE: Found existing appointment % to override', existing_appointment_id;
        END IF;
    END IF;

    -- Validate staff availability if staff are specified (only for non-override bookings)
    IF NOT _is_override AND array_length(_staff_profile_ids, 1) > 0 THEN
        FOREACH staff_id IN ARRAY _staff_profile_ids LOOP
            RAISE NOTICE '[create_booking_admin] VALIDATING STAFF AVAILABILITY: staff_id=%', staff_id;
            
            -- Check ALL slots in service duration using manual loop
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
                    RETURN json_build_object('success', false, 'error', 'STAFF_UNAVAILABLE', 'message', 
                        format('Staff %s not available for date %s at time %s', staff_id, _booking_date, check_time));
                END IF;
                
                check_minutes := check_minutes + 30;
            END LOOP;
            
            RAISE NOTICE '[create_booking_admin] STAFF AVAILABILITY: CONFIRMED for staff_id=%', staff_id;
        END LOOP;
    END IF;

    -- Create the appointment
    INSERT INTO appointments (
        client_id, 
        pet_id, 
        service_id, 
        date, 
        time, 
        notes,
        status,
        service_status,
        is_admin_override
    ) VALUES (
        _client_id, 
        _pet_id, 
        _service_id, 
        _booking_date, 
        _time_slot, 
        _notes,
        'confirmed', -- Admin bookings are auto-confirmed
        'not_started',
        _is_override
    ) RETURNING id INTO new_appointment_id;
    
    RAISE NOTICE '[create_booking_admin] APPOINTMENT CREATED: id=%', new_appointment_id;

    -- Add staff associations if staff are specified
    -- Use DISTINCT to prevent duplicate staff assignments
    IF array_length(_staff_profile_ids, 1) > 0 THEN
        INSERT INTO appointment_staff (appointment_id, staff_profile_id, role)
        SELECT DISTINCT new_appointment_id, unnest(_staff_profile_ids), 'primary'
        WHERE unnest(_staff_profile_ids) IS NOT NULL;
        
        RAISE NOTICE '[create_booking_admin] STAFF LINKED: appointment_id=%, staff_count=%', 
            new_appointment_id, array_length(_staff_profile_ids, 1);
    END IF;

    -- Update staff availability (only for non-override bookings)
    IF NOT _is_override AND array_length(_staff_profile_ids, 1) > 0 THEN
        FOREACH staff_id IN ARRAY _staff_profile_ids LOOP
            -- Update ALL slots in service duration using manual loop
            check_minutes := 0;
            WHILE check_minutes < service_duration LOOP
                check_time := _time_slot + (check_minutes || ' minutes')::interval;
                
                UPDATE staff_availability sa
                SET available = FALSE
                WHERE sa.staff_profile_id = staff_id 
                AND sa.date = _booking_date 
                AND sa.time_slot = check_time;
                
                check_minutes := check_minutes + 30;
            END LOOP;
            
            RAISE NOTICE '[create_booking_admin] STAFF AVAILABILITY UPDATED: staff_id=%, date=%, time=%', 
                staff_id, _booking_date, _time_slot;
        END LOOP;
    END IF;

    -- Log the event
    INSERT INTO appointment_events (appointment_id, event_type, notes)
    VALUES (new_appointment_id, 'created', 
        CASE 
            WHEN _is_override THEN 'Admin override booking created'
            ELSE 'Admin booking created'
        END);

    -- Queue notifications
    INSERT INTO notification_queue (appointment_id, recipient_type, recipient_id, message_type, message)
    VALUES (new_appointment_id, 'user', user_id, 'booking_created', 
        CASE 
            WHEN _is_override THEN 'An admin has created an override booking for your pet.'
            ELSE 'Your booking has been created by an administrator.'
        END);

    RAISE NOTICE '[create_booking_admin] SUCCESS: appointment_id=%', new_appointment_id;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'appointment_id', new_appointment_id,
        'message', CASE 
            WHEN _is_override THEN 'Override booking created successfully'
            ELSE 'Admin booking created successfully'
        END
    );
    
    RETURN result;

EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE '[create_booking_admin] DUPLICATE KEY ERROR: % - %', SQLSTATE, SQLERRM;
        RETURN json_build_object('success', false, 'error', 'DUPLICATE_STAFF', 'message', 'Staff already assigned to this appointment');
    WHEN OTHERS THEN
        RAISE NOTICE '[create_booking_admin] ERROR: % - %', SQLSTATE, SQLERRM;
        RETURN json_build_object('success', false, 'error', 'UNKNOWN_ERROR', 'message', SQLERRM);
END;
$$;