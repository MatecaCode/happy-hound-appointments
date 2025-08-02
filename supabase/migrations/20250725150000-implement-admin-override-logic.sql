-- Implement admin override logic for booking and cancellation
-- This migration adds tracking for originally available slots and implements layered booking logic

-- First, let's create a table to track which slots were originally available for admin override bookings
CREATE TABLE IF NOT EXISTS admin_override_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    staff_profile_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    was_originally_available BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(appointment_id, staff_profile_id, date, time_slot)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_admin_override_slots_appointment 
ON admin_override_slots(appointment_id);

CREATE INDEX IF NOT EXISTS idx_admin_override_slots_staff_date 
ON admin_override_slots(staff_profile_id, date, time_slot);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON admin_override_slots TO authenticated;

-- Now let's create an admin-specific cancellation function that only reverts originally available slots
CREATE OR REPLACE FUNCTION public.admin_cancel_appointment(
    p_appointment_id uuid,
    p_cancelled_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    appointment_record record;
    override_slot record;
    reverted_count integer := 0;
    total_override_slots integer := 0;
    admin_user_id uuid;
BEGIN
    -- Enhanced logging
    RAISE NOTICE '[ADMIN_CANCEL] Starting admin cancellation for appointment %', p_appointment_id;
    
    -- Validate input parameters
    IF p_appointment_id IS NULL THEN
        RAISE EXCEPTION '[ADMIN_CANCEL] Appointment ID cannot be NULL';
    END IF;

    -- Get admin user ID if not provided
    IF p_cancelled_by IS NULL THEN
        SELECT get_admin_user_id() INTO admin_user_id;
    ELSE
        admin_user_id := p_cancelled_by;
    END IF;

    -- Verify appointment exists and get its details
    SELECT * INTO appointment_record 
    FROM appointments 
    WHERE id = p_appointment_id;
    
    IF appointment_record IS NULL THEN
        RAISE EXCEPTION '[ADMIN_CANCEL] Appointment % not found', p_appointment_id;
    END IF;
    
    RAISE NOTICE '[ADMIN_CANCEL] Found appointment: status=%, is_admin_override=%, date=%, time=%', 
        appointment_record.status, appointment_record.is_admin_override, appointment_record.date, appointment_record.time;

    -- 1. Update appointment status to cancelled
    UPDATE appointments 
    SET 
        status = 'cancelled',
        updated_at = now()
    WHERE id = p_appointment_id;
    
    RAISE NOTICE '[ADMIN_CANCEL] Appointment % status updated to cancelled', p_appointment_id;

    -- 2. For admin override bookings, only revert slots that were originally available
    IF appointment_record.is_admin_override THEN
        RAISE NOTICE '[ADMIN_CANCEL] Processing admin override cancellation - only reverting originally available slots';
        
        -- Count total override slots for logging
        SELECT COUNT(*) INTO total_override_slots
        FROM admin_override_slots 
        WHERE appointment_id = p_appointment_id;
        
        RAISE NOTICE '[ADMIN_CANCEL] Found % override slots to process', total_override_slots;
        
        -- Process each override slot
        FOR override_slot IN 
            SELECT * FROM admin_override_slots 
            WHERE appointment_id = p_appointment_id
        LOOP
            BEGIN
                RAISE NOTICE '[ADMIN_CANCEL] Processing override slot: staff=%, date=%, time=%, was_originally_available=%', 
                    override_slot.staff_profile_id, override_slot.date, override_slot.time_slot, override_slot.was_originally_available;
                
                -- Only revert slots that were originally available
                IF override_slot.was_originally_available THEN
                    UPDATE staff_availability 
                    SET 
                        available = TRUE,
                        updated_at = now()
                    WHERE 
                        staff_profile_id = override_slot.staff_profile_id 
                        AND date = override_slot.date 
                        AND time_slot = override_slot.time_slot;
                    
                    IF FOUND THEN
                        reverted_count := reverted_count + 1;
                        RAISE NOTICE '[ADMIN_CANCEL] ✓ Reverted originally available slot % for staff % on %', 
                            override_slot.time_slot, override_slot.staff_profile_id, override_slot.date;
                    ELSE
                        RAISE WARNING '[ADMIN_CANCEL] ⚠ Slot % for staff % on % not found or already available', 
                            override_slot.time_slot, override_slot.staff_profile_id, override_slot.date;
                    END IF;
                ELSE
                    RAISE NOTICE '[ADMIN_CANCEL] ⏭ Skipping slot % for staff % on % (was not originally available)', 
                        override_slot.time_slot, override_slot.staff_profile_id, override_slot.date;
                END IF;
                
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING '[ADMIN_CANCEL] ✗ Failed to process override slot % for staff %: % (SQLSTATE: %)', 
                        override_slot.time_slot, override_slot.staff_profile_id, SQLERRM, SQLSTATE;
                    -- Continue processing other slots instead of failing completely
            END;
        END LOOP;
        
        -- Clean up override slots tracking
        DELETE FROM admin_override_slots WHERE appointment_id = p_appointment_id;
        RAISE NOTICE '[ADMIN_CANCEL] Cleaned up override slots tracking for appointment %', p_appointment_id;
        
    ELSE
        -- For regular bookings, use the standard cancellation logic
        RAISE NOTICE '[ADMIN_CANCEL] Processing regular booking cancellation';
        -- This would call the standard atomic_cancel_appointment function
        -- For now, we'll just log that this is a regular booking
    END IF;

    -- 3. Log the cancellation event
    INSERT INTO appointment_events (appointment_id, event_type, notes)
    VALUES (
        p_appointment_id, 
        'cancelled', 
        format('Appointment cancelled by admin. Reverted %s override slots.', reverted_count)
    );

    -- 4. Log admin action for audit trail
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO admin_actions (admin_user_id, action_type, target_appointment_id, details)
        VALUES (admin_user_id, 'cancel_booking', p_appointment_id, 
                json_build_object(
                    'was_admin_override', appointment_record.is_admin_override,
                    'reverted_slots_count', reverted_count,
                    'total_override_slots', total_override_slots
                )::text
        );
    END IF;

    -- 5. Log completion summary
    RAISE NOTICE '[ADMIN_CANCEL] ✓ Completed admin cancellation for appointment %. Reverted %/% override slots.', 
        p_appointment_id, reverted_count, total_override_slots;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '[ADMIN_CANCEL] ✗ Admin cancellation failed for appointment %: % (SQLSTATE: %)', 
            p_appointment_id, SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_cancel_appointment TO authenticated;

-- Now let's update the create_booking_admin function to implement the override logic
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
        _override_conflicts,
        TRUE
    ) RETURNING id INTO new_appointment_id;
    
    RAISE NOTICE '[create_booking_admin] APPOINTMENT CREATED: id=%, duration=%, price=%, is_admin_override=%', 
        new_appointment_id, service_duration, final_price, _override_conflicts;

    -- Add staff associations if staff are specified
    IF array_length(_provider_ids, 1) > 0 THEN
        FOREACH staff_id IN ARRAY _provider_ids LOOP
            INSERT INTO appointment_staff (appointment_id, staff_profile_id, role)
            VALUES (new_appointment_id, staff_id, 'primary');
            
            RAISE NOTICE '[create_booking_admin] STAFF LINKED: appointment_id=%, staff_id=%', new_appointment_id, staff_id;
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
                    'override_slots_tracked', override_slots_created
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