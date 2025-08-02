-- Add admin override booking functionality
-- This migration adds the is_override parameter to create_booking_atomic function
-- When is_override is true, the function skips availability validation and allows booking conflicts

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
    _user_id uuid,
    _pet_id uuid,
    _service_id uuid,
    _provider_ids uuid[],
    _booking_date date,
    _time_slot time without time zone,
    _notes text DEFAULT NULL,
    _calculated_price numeric DEFAULT NULL,
    _calculated_duration integer DEFAULT NULL,
    _is_override boolean DEFAULT FALSE
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
    conflict_count INTEGER;
BEGIN
    -- Enhanced logging for debugging
    RAISE NOTICE '[create_booking_atomic] CALLED with params: user_id=%, pet_id=%, service_id=%, provider_ids=%, booking_date=%, time_slot=%, notes=%, calculated_price=%, calculated_duration=%, is_override=%', 
        _user_id, _pet_id, _service_id, _provider_ids, _booking_date, _time_slot, _notes, _calculated_price, _calculated_duration, _is_override;

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

    -- Use calculated duration if provided, otherwise fall back to service default
    IF _calculated_duration IS NOT NULL THEN
        service_duration := _calculated_duration;
        RAISE NOTICE '[create_booking_atomic] Using calculated duration: % minutes', service_duration;
    ELSE
        -- Get service duration (use default_duration, not duration_minutes)
        SELECT COALESCE(default_duration, 60) INTO service_duration 
        FROM services 
        WHERE id = _service_id;
        
        IF service_duration IS NULL THEN
            RAISE EXCEPTION 'Service not found: %', _service_id;
        END IF;
        
        RAISE NOTICE '[create_booking_atomic] Using service default duration: % minutes', service_duration;
    END IF;

    -- Use calculated price if provided, otherwise fall back to service base price
    IF _calculated_price IS NOT NULL THEN
        final_price := _calculated_price;
        RAISE NOTICE '[create_booking_atomic] Using calculated price: R$ %', final_price;
    ELSE
        SELECT COALESCE(base_price, 0) INTO final_price 
        FROM services 
        WHERE id = _service_id;
        
        RAISE NOTICE '[create_booking_atomic] Using service base price: R$ %', final_price;
    END IF;
    
    -- Calculate end time
    end_time := _time_slot + (service_duration || ' minutes')::INTERVAL;
    RAISE NOTICE '[create_booking_atomic] TIME CALCULATION: start_time=%, duration=% minutes, end_time=%', 
        _time_slot, service_duration, end_time;

    -- Check for conflicts if override is enabled
    IF _is_override AND array_length(_provider_ids, 1) > 0 THEN
        FOREACH staff_id IN ARRAY _provider_ids LOOP
            -- Count existing appointments that would conflict
            SELECT COUNT(*) INTO conflict_count
            FROM appointments a
            JOIN appointment_staff ast ON a.id = ast.appointment_id
            WHERE ast.staff_profile_id = staff_id
            AND a.date = _booking_date
            AND (
                (a.time <= _time_slot AND a.time + (a.duration || ' minutes')::interval > _time_slot)
                OR (a.time < end_time AND a.time + (a.duration || ' minutes')::interval >= end_time)
                OR (a.time >= _time_slot AND a.time + (a.duration || ' minutes')::interval <= end_time)
            );
            
            IF conflict_count > 0 THEN
                RAISE NOTICE '[create_booking_atomic] OVERRIDE CONFLICT DETECTED: staff_id=%, conflicts=%, proceeding with override', staff_id, conflict_count;
            END IF;
        END LOOP;
    END IF;

    -- Validate staff availability if staff are specified AND override is disabled
    IF NOT _is_override AND array_length(_provider_ids, 1) > 0 THEN
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

    -- Create the appointment with calculated values
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
        total_price
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
        final_price
    ) RETURNING id INTO new_appointment_id;
    
    RAISE NOTICE '[create_booking_atomic] APPOINTMENT CREATED: id=%, duration=%, price=%', new_appointment_id, service_duration, final_price;

    -- Add staff associations if staff are specified
    IF array_length(_provider_ids, 1) > 0 THEN
        FOREACH staff_id IN ARRAY _provider_ids LOOP
            INSERT INTO appointment_staff (appointment_id, staff_profile_id, role)
            VALUES (new_appointment_id, staff_id, 'primary');
            
            RAISE NOTICE '[create_booking_atomic] STAFF LINKED: appointment_id=%, staff_id=%', new_appointment_id, staff_id;
        END LOOP;
    END IF;

    -- Block ALL 10-minute slots for the service duration (only if not override)
    IF NOT _is_override AND array_length(_provider_ids, 1) > 0 THEN
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
    VALUES (new_appointment_id, 'created', CASE 
        WHEN _is_override THEN 'Admin override booking created'
        ELSE 'Booking created via atomic function'
    END);

    -- Queue notifications
    INSERT INTO notification_queue (appointment_id, recipient_type, recipient_id, message_type, message)
    VALUES (new_appointment_id, 'user', _user_id, 'booking_created', 'Your booking has been created and is pending confirmation.');

    RAISE NOTICE '[create_booking_atomic] SUCCESS: appointment_id=%, override=%', new_appointment_id, _is_override;
    RETURN new_appointment_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[create_booking_atomic] ERROR: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$; 