-- Clean up legacy provider_id references and create missing create_booking_client function
-- This migration addresses the "column reference provider_id is ambiguous" error

-- 1. Drop legacy functions that still use provider_id
DROP FUNCTION IF EXISTS public.atomic_create_appointment(uuid, uuid, uuid, uuid, date, time without time zone, text);

-- 2. Create the missing create_booking_client function (wrapper around create_booking_atomic)
CREATE OR REPLACE FUNCTION public.create_booking_client(
    _client_user_id uuid,
    _pet_id uuid,
    _service_id uuid,
    _provider_ids uuid[],
    _booking_date date,
    _time_slot time without time zone,
    _notes text DEFAULT NULL,
    _calculated_price numeric DEFAULT NULL,
    _calculated_duration integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    appointment_id uuid;
BEGIN
    -- Enhanced logging for debugging
    RAISE NOTICE '[create_booking_client] CALLED with params: client_user_id=%, pet_id=%, service_id=%, provider_ids=%, booking_date=%, time_slot=%, notes=%, calculated_price=%, calculated_duration=%', 
        _client_user_id, _pet_id, _service_id, _provider_ids, _booking_date, _time_slot, _notes, _calculated_price, _calculated_duration;

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

    -- Call the atomic booking function with client user ID
    SELECT create_booking_atomic(
        _client_user_id,
        _pet_id,
        _service_id,
        _provider_ids,
        _booking_date,
        _time_slot,
        _notes,
        _calculated_price,
        _calculated_duration
    ) INTO appointment_id;

    RAISE NOTICE '[create_booking_client] SUCCESS: appointment_id=%', appointment_id;
    RETURN appointment_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[create_booking_client] ERROR: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$;

-- 3. Update create_booking_admin to handle multi-role staff assignments properly
-- This ensures that if a service requires both banhista and tosador roles, 
-- we create separate appointment_staff entries even if it's the same person
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
    slot_was_originally_available BOOLEAN;
    override_slots_created INTEGER := 0;
    service_record RECORD;
    required_roles TEXT[] := '{}';
    role TEXT;
    staff_roles TEXT[] := '{}';
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

    -- Get service details to determine required roles
    SELECT * INTO service_record FROM services WHERE id = _service_id;
    IF service_record IS NULL THEN
        RAISE EXCEPTION 'Service not found: %', _service_id;
    END IF;

    -- Determine required roles based on service requirements
    IF service_record.requires_bath THEN
        required_roles := array_append(required_roles, 'banhista');
    END IF;
    IF service_record.requires_grooming THEN
        required_roles := array_append(required_roles, 'tosador');
    END IF;
    IF service_record.requires_vet THEN
        required_roles := array_append(required_roles, 'veterinario');
    END IF;

    -- If no specific roles required, use 'primary' as default
    IF array_length(required_roles, 1) IS NULL THEN
        required_roles := ARRAY['primary'];
    END IF;

    RAISE NOTICE '[create_booking_admin] Service requires roles: %', required_roles;

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
        _override_conflicts,
        TRUE
    ) RETURNING id INTO new_appointment_id;
    
    RAISE NOTICE '[create_booking_admin] APPOINTMENT CREATED: id=%, duration=%, price=%, is_admin_override=%', 
        new_appointment_id, service_duration, final_price, _override_conflicts;

    -- Add staff associations with proper role handling
    IF array_length(_provider_ids, 1) > 0 THEN
        -- If we have multiple staff members, assign them to roles in order
        -- If we have fewer staff than roles, the last staff member gets multiple roles
        FOR i IN 1..array_length(required_roles, 1) LOOP
            role := required_roles[i];
            staff_id := _provider_ids[LEAST(i, array_length(_provider_ids, 1))];
            
            INSERT INTO appointment_staff (appointment_id, staff_profile_id, role)
            VALUES (new_appointment_id, staff_id, role);
            
            RAISE NOTICE '[create_booking_admin] STAFF LINKED: appointment_id=%, staff_id=%, role=%', new_appointment_id, staff_id, role;
        END LOOP;
    END IF;

    -- Block slots with override logic
    IF array_length(_provider_ids, 1) > 0 THEN
        FOREACH staff_id IN ARRAY _provider_ids LOOP
            -- Block ALL 10-minute slots in service duration
            check_minutes := 0;
            WHILE check_minutes < service_duration LOOP
                check_time := _time_slot + (check_minutes || ' minutes')::interval;
                
                -- Check if slot was originally available before blocking
                SELECT available INTO slot_was_originally_available
                FROM staff_availability 
                WHERE staff_profile_id = staff_id 
                AND date = _booking_date 
                AND time_slot = check_time;
                
                -- If slot doesn't exist, assume it was available (for new slots)
                IF slot_was_originally_available IS NULL THEN
                    slot_was_originally_available := TRUE;
                END IF;
                
                -- Block the slot
                UPDATE staff_availability sa
                SET available = FALSE
                WHERE sa.staff_profile_id = staff_id 
                AND sa.date = _booking_date 
                AND sa.time_slot = check_time;
                
                -- If this is an override booking, track which slots were originally available
                IF _override_conflicts THEN
                    INSERT INTO admin_override_slots (
                        appointment_id, 
                        staff_profile_id, 
                        date, 
                        time_slot, 
                        was_originally_available
                    ) VALUES (
                        new_appointment_id,
                        staff_id,
                        _booking_date,
                        check_time,
                        slot_was_originally_available
                    );
                    
                    override_slots_created := override_slots_created + 1;
                    RAISE NOTICE '[create_booking_admin] OVERRIDE SLOT TRACKED: staff_id=%, date=%, time=%, was_originally_available=%', 
                        staff_id, _booking_date, check_time, slot_was_originally_available;
                END IF;
                
                RAISE NOTICE '[create_booking_admin] BLOCKED SLOT: staff_id=%, date=%, time=%', staff_id, _booking_date, check_time;
                
                -- Use 10-minute increments for precise slot blocking
                check_minutes := check_minutes + 10;
            END LOOP;
            
            RAISE NOTICE '[create_booking_admin] ALL SLOTS BLOCKED: staff_id=%, date=%, duration=%min, override_slots_tracked=%', 
                staff_id, _booking_date, service_duration, override_slots_created;
        END LOOP;
    END IF;

    -- Log the event
    INSERT INTO appointment_events (appointment_id, event_type, notes)
    VALUES (new_appointment_id, 'created', 
        CASE 
            WHEN _override_conflicts THEN 'Admin override booking created'
            ELSE 'Booking created via admin function'
        END
    );

    -- Queue notifications for the client
    INSERT INTO notification_queue (appointment_id, recipient_type, recipient_id, message_type, message)
    VALUES (new_appointment_id, 'user', _client_user_id, 'booking_created', 
        CASE 
            WHEN _override_conflicts THEN 'Your booking has been created with admin override and is pending confirmation.'
            ELSE 'Your booking has been created and is pending confirmation.'
        END
    );

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
                    'override_conflicts', _override_conflicts,
                    'override_slots_tracked', override_slots_created,
                    'required_roles', required_roles
                )::text
        );
    END IF;

    RAISE NOTICE '[create_booking_admin] SUCCESS: appointment_id=%, override_slots_tracked=%', 
        new_appointment_id, override_slots_created;
    RETURN new_appointment_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[create_booking_admin] ERROR: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$;

-- 4. Create a wrapper function for admin override bookings (for clarity)
CREATE OR REPLACE FUNCTION public.create_booking_admin_override(
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
    _override_on_top_of_appointment_id uuid DEFAULT NULL,
    _admin_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    appointment_id uuid;
BEGIN
    -- Enhanced logging for debugging
    RAISE NOTICE '[create_booking_admin_override] CALLED with params: client_user_id=%, pet_id=%, service_id=%, provider_ids=%, booking_date=%, time_slot=%, notes=%, calculated_price=%, calculated_duration=%, created_by=%, override_appointment_id=%, admin_notes=%', 
        _client_user_id, _pet_id, _service_id, _provider_ids, _booking_date, _time_slot, _notes, _calculated_price, _calculated_duration, _created_by, _override_on_top_of_appointment_id, _admin_notes;

    -- Call the main admin booking function with override flag
    SELECT create_booking_admin(
        _client_user_id,
        _pet_id,
        _service_id,
        _provider_ids,
        _booking_date,
        _time_slot,
        _notes,
        _calculated_price,
        _calculated_duration,
        _created_by,
        TRUE  -- _override_conflicts = TRUE
    ) INTO appointment_id;

    -- If we have override appointment ID and admin notes, log them
    IF _override_on_top_of_appointment_id IS NOT NULL AND _admin_notes IS NOT NULL THEN
        INSERT INTO admin_actions (admin_user_id, action_type, target_appointment_id, details)
        VALUES (_created_by, 'override_booking', appointment_id, 
                json_build_object(
                    'overridden_appointment_id', _override_on_top_of_appointment_id,
                    'admin_notes', _admin_notes
                )::text
        );
    END IF;

    RAISE NOTICE '[create_booking_admin_override] SUCCESS: appointment_id=%', appointment_id;
    RETURN appointment_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[create_booking_admin_override] ERROR: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$;

-- 5. Add helpful comments for future maintainers
COMMENT ON FUNCTION public.create_booking_client IS
'Client booking function that wraps create_booking_atomic. Used for regular client bookings with strict availability validation.';

COMMENT ON FUNCTION public.create_booking_admin IS
'Admin booking function with override support. Handles multi-role staff assignments and tracks override slots.';

COMMENT ON FUNCTION public.create_booking_admin_override IS
'Admin override booking wrapper. Always sets override_conflicts = true and logs override details.'; 