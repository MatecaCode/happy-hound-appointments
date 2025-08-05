-- Create the edit_booking_admin function for admin editing of appointments
-- This function handles duration changes, slot management, and audit logging

CREATE OR REPLACE FUNCTION public.edit_booking_admin(
    _appointment_id uuid,
    _new_date date,
    _new_time time,
    _new_duration integer DEFAULT NULL,
    _extra_fee numeric DEFAULT NULL,
    _admin_notes text DEFAULT NULL,
    _edit_reason text DEFAULT NULL,
    _edited_by uuid DEFAULT NULL,
    _force_override boolean DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    appointment_record record;
    staff_ids uuid[];
    old_duration integer;
    new_duration integer;
    old_date date;
    old_time time;
    staff_id uuid;
    check_time time;
    check_minutes integer;
    slots_freed integer := 0;
    slots_blocked integer := 0;
    admin_user_id uuid;
BEGIN
    -- Enhanced logging
    RAISE NOTICE '[EDIT_BOOKING_ADMIN] Starting edit for appointment %', _appointment_id;
    
    -- Validate input parameters
    IF _appointment_id IS NULL THEN
        RAISE EXCEPTION '[EDIT_BOOKING_ADMIN] Appointment ID cannot be NULL';
    END IF;

    -- Get admin user ID if not provided
    IF _edited_by IS NULL THEN
        SELECT get_admin_user_id() INTO admin_user_id;
    ELSE
        admin_user_id := _edited_by;
    END IF;

    -- Get current appointment details
    SELECT * INTO appointment_record 
    FROM appointments 
    WHERE id = _appointment_id;
    
    IF appointment_record IS NULL THEN
        RAISE EXCEPTION '[EDIT_BOOKING_ADMIN] Appointment % not found', _appointment_id;
    END IF;
    
    -- Get staff IDs for this appointment
    SELECT array_agg(staff_profile_id) INTO staff_ids
    FROM appointment_staff
    WHERE appointment_id = _appointment_id;
    
    old_duration := appointment_record.duration;
    old_date := appointment_record.date;
    old_time := appointment_record.time;
    
    -- Determine new duration
    IF _new_duration IS NOT NULL AND _new_duration > 0 THEN
        new_duration := _new_duration;
    ELSE
        new_duration := old_duration;
    END IF;
    
    RAISE NOTICE '[EDIT_BOOKING_ADMIN] Duration change: % -> % minutes', old_duration, new_duration;
    RAISE NOTICE '[EDIT_BOOKING_ADMIN] Date change: % -> %', old_date, _new_date;
    RAISE NOTICE '[EDIT_BOOKING_ADMIN] Time change: % -> %', old_time, _new_time;

    -- 1. Free up old slots (if date/time changed)
    IF old_date != _new_date OR old_time != _new_time THEN
        RAISE NOTICE '[EDIT_BOOKING_ADMIN] Freeing up old slots for date % time %', old_date, old_time;
        
        FOREACH staff_id IN ARRAY staff_ids LOOP
            check_minutes := 0;
            WHILE check_minutes < old_duration LOOP
                check_time := old_time + (check_minutes || ' minutes')::interval;
                
                UPDATE staff_availability 
                SET available = TRUE, updated_at = now()
                WHERE staff_profile_id = staff_id 
                AND date = old_date 
                AND time_slot = check_time;
                
                IF FOUND THEN
                    slots_freed := slots_freed + 1;
                END IF;
                
                check_minutes := check_minutes + 10;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE '[EDIT_BOOKING_ADMIN] Freed % slots from old appointment', slots_freed;
    END IF;

    -- 2. Update appointment details
    UPDATE appointments 
    SET 
        date = _new_date,
        time = _new_time,
        duration = new_duration,
        extra_fee = COALESCE(_extra_fee, extra_fee),
        notes = COALESCE(_admin_notes, notes),
        updated_at = now()
    WHERE id = _appointment_id;
    
    RAISE NOTICE '[EDIT_BOOKING_ADMIN] Updated appointment details';

    -- 3. Block new slots
    IF array_length(staff_ids, 1) > 0 THEN
        RAISE NOTICE '[EDIT_BOOKING_ADMIN] Blocking new slots for date % time % duration %', _new_date, _new_time, new_duration;
        
        FOREACH staff_id IN ARRAY staff_ids LOOP
            check_minutes := 0;
            WHILE check_minutes < new_duration LOOP
                check_time := _new_time + (check_minutes || ' minutes')::interval;
                
                -- Block the slot
                UPDATE staff_availability 
                SET available = FALSE, updated_at = now()
                WHERE staff_profile_id = staff_id 
                AND date = _new_date 
                AND time_slot = check_time;
                
                IF FOUND THEN
                    slots_blocked := slots_blocked + 1;
                END IF;
                
                check_minutes := check_minutes + 10;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE '[EDIT_BOOKING_ADMIN] Blocked % slots for new appointment', slots_blocked;
    END IF;

    -- 4. Log the edit event
    INSERT INTO appointment_events (appointment_id, event_type, notes)
    VALUES (
        _appointment_id, 
        'edited', 
        format('Appointment edited by admin. Duration: % -> % min, Date: % -> %, Time: % -> %', 
            old_duration, new_duration, old_date, _new_date, old_time, _new_time)
    );

    -- 5. Log admin action for audit trail
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO admin_actions (admin_user_id, action_type, target_appointment_id, details)
        VALUES (admin_user_id, 'edit_booking', _appointment_id, 
                json_build_object(
                    'old_duration', old_duration,
                    'new_duration', new_duration,
                    'duration_change', new_duration - old_duration,
                    'old_date', old_date,
                    'new_date', _new_date,
                    'old_time', old_time,
                    'new_time', _new_time,
                    'extra_fee', _extra_fee,
                    'admin_notes', _admin_notes,
                    'edit_reason', _edit_reason,
                    'force_override', _force_override,
                    'slots_freed', slots_freed,
                    'slots_blocked', slots_blocked
                )::text
        );
    END IF;

    -- 6. Log completion summary
    RAISE NOTICE '[EDIT_BOOKING_ADMIN] ✓ Completed edit for appointment %. Freed % slots, blocked % slots.', 
        _appointment_id, slots_freed, slots_blocked;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '[EDIT_BOOKING_ADMIN] ✗ Edit failed for appointment %: % (SQLSTATE: %)', 
            _appointment_id, SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.edit_booking_admin TO authenticated; 