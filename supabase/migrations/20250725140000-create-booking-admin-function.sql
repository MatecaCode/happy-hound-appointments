-- Create the create_booking_admin function for admin booking operations
-- This function allows admins to book for any client and bypass certain constraints

CREATE OR REPLACE FUNCTION public.create_booking_admin(
    _client_user_id uuid,
    _pet_id uuid,
    _service_id uuid,
    _provider_ids uuid[],
    _booking_date date,
    _time_slot time without time zone,
    _notes text DEFAULT NULL,
    _calculated_price numeric DEFAULT NULL,
    _calculated_duration integer DEFAULT NULL,
    _created_by uuid DEFAULT NULL,
    _override_conflicts boolean DEFAULT FALSE
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    new_appointment_id UUID;
    staff_id UUID;
    service_duration INTEGER;
    final_price NUMERIC;
    end_time TIME;
    check_time TIME;
    check_minutes INTEGER;
    client_id UUID;
BEGIN
    -- Enhanced logging for debugging
    RAISE NOTICE '[create_booking_admin] CALLED with params: client_user_id=%, pet_id=%, service_id=%, provider_ids=%, booking_date=%, time_slot=%, notes=%, calculated_price=%, calculated_duration=%, created_by=%, override_conflicts=%', 
        _client_user_id, _pet_id, _service_id, _provider_ids, _booking_date, _time_slot, _notes, _calculated_price, _calculated_duration, _created_by, _override_conflicts;

    -- Validate required parameters
    IF _client_user_id IS NULL THEN
        RAISE EXCEPTION 'Client User ID is required';
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

    -- Get client_id from client_user_id
    SELECT c.id INTO client_id 
    FROM clients c 
    WHERE c.user_id = _client_user_id;
    
    IF client_id IS NULL THEN
        RAISE EXCEPTION 'Client record not found for user: %', _client_user_id;
    END IF;

    -- Use calculated duration if provided, otherwise fall back to service default
    IF _calculated_duration IS NOT NULL THEN
        service_duration := _calculated_duration;
        RAISE NOTICE '[create_booking_admin] Using calculated duration: % minutes', service_duration;
    ELSE
        -- Get service duration (use default_duration, not duration_minutes)
        SELECT COALESCE(default_duration, 60) INTO service_duration 
        FROM services 
        WHERE id = _service_id;
        
        IF service_duration IS NULL THEN
            RAISE EXCEPTION 'Service not found: %', _service_id;
        END IF;
        
        RAISE NOTICE '[create_booking_admin] Using service default duration: % minutes', service_duration;
    END IF;

    -- Use calculated price if provided, otherwise fall back to service base price
    IF _calculated_price IS NOT NULL THEN
        final_price := _calculated_price;
        RAISE NOTICE '[create_booking_admin] Using calculated price: R$ %', final_price;
    ELSE
        SELECT COALESCE(base_price, 0) INTO final_price 
        FROM services 
        WHERE id = _service_id;
        
        RAISE NOTICE '[create_booking_admin] Using service base price: R$ %', final_price;
    END IF;
    
    -- Calculate end time
    end_time := _time_slot + (service_duration || ' minutes')::INTERVAL;
    RAISE NOTICE '[create_booking_admin] TIME CALCULATION: start_time=%, duration=% minutes, end_time=%', 
        _time_slot, service_duration, end_time;

    -- Validate staff availability if staff are specified (only if not overriding conflicts)
    IF array_length(_provider_ids, 1) > 0 AND NOT _override_conflicts THEN
        FOREACH staff_id IN ARRAY _provider_ids LOOP
            RAISE NOTICE '[create_booking_admin] VALIDATING STAFF AVAILABILITY: staff_id=%', staff_id;
            
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
            
            RAISE NOTICE '[create_booking_admin] STAFF AVAILABILITY: CONFIRMED for staff_id=%', staff_id;
        END LOOP;
    END IF;

    -- Create the appointment with calculated values and admin flags
    INSERT INTO appointments (
        client_id, 
        pet_id, 
        service_id, 
        date, 
        time, 
        notes,
        status,
        service_status,
        duration,
        total_price,
        is_admin_override,
        booked_by_admin
    ) VALUES (
        client_id, 
        _pet_id, 
        _service_id, 
        _booking_date, 
        _time_slot, 
        _notes,
        'pending',
        'not_started',
        service_duration,
        final_price,
        TRUE,
        TRUE
    ) RETURNING id INTO new_appointment_id;
    
    RAISE NOTICE '[create_booking_admin] APPOINTMENT CREATED: id=%, duration=%, price=%', new_appointment_id, service_duration, final_price;

    -- Add staff associations if staff are specified
    IF array_length(_provider_ids, 1) > 0 THEN
        FOREACH staff_id IN ARRAY _provider_ids LOOP
            INSERT INTO appointment_staff (appointment_id, staff_profile_id, role)
            VALUES (new_appointment_id, staff_id, 'primary');
            
            RAISE NOTICE '[create_booking_admin] STAFF LINKED: appointment_id=%, staff_id=%', new_appointment_id, staff_id;
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
                
                RAISE NOTICE '[create_booking_admin] BLOCKED SLOT: staff_id=%, date=%, time=%', staff_id, _booking_date, check_time;
                
                -- Use 10-minute increments for precise slot blocking
                check_minutes := check_minutes + 10;
            END LOOP;
            
            RAISE NOTICE '[create_booking_admin] ALL SLOTS BLOCKED: staff_id=%, date=%, duration=%min', staff_id, _booking_date, service_duration;
        END LOOP;
    END IF;

    -- Log the event
    INSERT INTO appointment_events (appointment_id, event_type, notes)
    VALUES (new_appointment_id, 'created', 'Booking created via admin function');

    -- Queue notifications for the client
    INSERT INTO notification_queue (appointment_id, recipient_type, recipient_id, message_type, message)
    VALUES (new_appointment_id, 'user', _client_user_id, 'booking_created', 'Your booking has been created and is pending confirmation.');

    -- Log admin action for audit trail
    IF _created_by IS NOT NULL THEN
        INSERT INTO admin_actions (admin_user_id, action_type, target_appointment_id, details)
        VALUES (_created_by, 'create_booking', new_appointment_id, 
                json_build_object(
                    'client_user_id', _client_user_id,
                    'pet_id', _pet_id,
                    'service_id', _service_id,
                    'provider_ids', _provider_ids,
                    'booking_date', _booking_date,
                    'time_slot', _time_slot,
                    'override_conflicts', _override_conflicts
                )::text
        );
    END IF;

    RAISE NOTICE '[create_booking_admin] SUCCESS: appointment_id=%', new_appointment_id;
    RETURN new_appointment_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[create_booking_admin] ERROR: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$; 