-- Create edit_admin_booking_with_dual_services function for editing dual-service appointments
-- This function handles duration changes, slot management, and audit logging for dual services

CREATE OR REPLACE FUNCTION public.edit_admin_booking_with_dual_services(
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
    service_assignments record[];
    primary_service_record record;
    secondary_service_record record;
    primary_staff_id uuid;
    secondary_staff_id uuid;
    primary_service_duration integer;
    secondary_service_duration integer;
    old_duration integer;
    new_total_duration integer;
    old_date date;
    old_time time;
    check_time time;
    check_minutes integer;
    slots_freed integer := 0;
    slots_blocked integer := 0;
    admin_user_id uuid;
BEGIN
    -- Enhanced logging
    RAISE NOTICE '[EDIT_DUAL_BOOKING] Starting dual-service edit for appointment %', _appointment_id;
    
    -- Validate input parameters
    IF _appointment_id IS NULL THEN
        RAISE EXCEPTION '[EDIT_DUAL_BOOKING] Appointment ID cannot be NULL';
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
        RAISE EXCEPTION '[EDIT_DUAL_BOOKING] Appointment % not found', _appointment_id;
    END IF;
    
    old_duration := appointment_record.duration;
    old_date := appointment_record.date;
    old_time := appointment_record.time;
    
    -- Get service assignments with staff details
    SELECT array_agg(
        ROW(
            aps.service_id,
            aps.service_order,
            aps.duration,
            s.name,
            ast.staff_profile_id,
            sp.name
        )::record
    ) INTO service_assignments
    FROM appointment_services aps
    JOIN services s ON aps.service_id = s.id
    LEFT JOIN appointment_staff ast ON ast.appointment_id = aps.appointment_id AND ast.service_id = aps.service_id
    LEFT JOIN staff_profiles sp ON ast.staff_profile_id = sp.id
    WHERE aps.appointment_id = _appointment_id
    ORDER BY aps.service_order;
    
    IF array_length(service_assignments, 1) = 0 THEN
        RAISE EXCEPTION '[EDIT_DUAL_BOOKING] No service assignments found for appointment: %', _appointment_id;
    END IF;
    
    -- Extract primary service details (service_order = 1)
    SELECT sa.* INTO primary_service_record
    FROM unnest(service_assignments) sa
    WHERE (sa).f2 = 1; -- service_order = 1
    
    IF primary_service_record IS NULL THEN
        RAISE EXCEPTION '[EDIT_DUAL_BOOKING] Primary service not found for appointment: %', _appointment_id;
    END IF;
    
    primary_staff_id := (primary_service_record).f5; -- staff_profile_id
    primary_service_duration := (primary_service_record).f3; -- duration
    
    -- Extract secondary service details (service_order = 2) if exists
    SELECT sa.* INTO secondary_service_record
    FROM unnest(service_assignments) sa
    WHERE (sa).f2 = 2; -- service_order = 2
    
    IF secondary_service_record IS NOT NULL THEN
        secondary_staff_id := (secondary_service_record).f5; -- staff_profile_id
        secondary_service_duration := (secondary_service_record).f3; -- duration
    ELSE
        secondary_staff_id := NULL;
        secondary_service_duration := 0;
    END IF;
    
    -- Determine new total duration
    IF _new_duration IS NOT NULL AND _new_duration > 0 THEN
        new_total_duration := _new_duration;
    ELSE
        new_total_duration := primary_service_duration + secondary_service_duration;
    END IF;
    
    RAISE NOTICE '[EDIT_DUAL_BOOKING] Duration change: % -> % minutes', old_duration, new_total_duration;
    RAISE NOTICE '[EDIT_DUAL_BOOKING] Date change: % -> %', old_date, _new_date;
    RAISE NOTICE '[EDIT_DUAL_BOOKING] Time change: % -> %', old_time, _new_time;
    RAISE NOTICE '[EDIT_DUAL_BOOKING] Primary staff: %, duration: %min', primary_staff_id, primary_service_duration;
    RAISE NOTICE '[EDIT_DUAL_BOOKING] Secondary staff: %, duration: %min', secondary_staff_id, secondary_service_duration;

    -- 1. Free up old slots (if date/time changed)
    IF old_date != _new_date OR old_time != _new_time THEN
        RAISE NOTICE '[EDIT_DUAL_BOOKING] Freeing up old slots for date % time %', old_date, old_time;
        
        -- Free primary staff slots
        IF primary_staff_id IS NOT NULL THEN
            check_minutes := 0;
            WHILE check_minutes < primary_service_duration LOOP
                check_time := old_time + (check_minutes || ' minutes')::interval;
                
                UPDATE staff_availability 
                SET available = TRUE, updated_at = now()
                WHERE staff_profile_id = primary_staff_id 
                AND date = old_date 
                AND time_slot = check_time;
                
                IF FOUND THEN
                    slots_freed := slots_freed + 1;
                END IF;
                
                check_minutes := check_minutes + 10;
            END LOOP;
        END IF;
        
        -- Free secondary staff slots (if different from primary and exists)
        IF secondary_staff_id IS NOT NULL AND secondary_staff_id != primary_staff_id AND secondary_service_duration > 0 THEN
            check_minutes := 0;
            WHILE check_minutes < secondary_service_duration LOOP
                -- Secondary service starts after primary service
                check_time := old_time + (primary_service_duration + check_minutes || ' minutes')::interval;
                
                UPDATE staff_availability 
                SET available = TRUE, updated_at = now()
                WHERE staff_profile_id = secondary_staff_id 
                AND date = old_date 
                AND time_slot = check_time;
                
                IF FOUND THEN
                    slots_freed := slots_freed + 1;
                END IF;
                
                check_minutes := check_minutes + 10;
            END LOOP;
        END IF;
        
        RAISE NOTICE '[EDIT_DUAL_BOOKING] Freed % slots from old appointment', slots_freed;
    END IF;

    -- 2. Update appointment details
    UPDATE appointments 
    SET 
        date = _new_date,
        time = _new_time,
        duration = new_total_duration,
        extra_fee = COALESCE(_extra_fee, extra_fee),
        notes = COALESCE(_admin_notes, notes),
        updated_at = now()
    WHERE id = _appointment_id;
    
    RAISE NOTICE '[EDIT_DUAL_BOOKING] Updated appointment details';

    -- 3. Block new slots with service-specific durations
    RAISE NOTICE '[EDIT_DUAL_BOOKING] Blocking new slots for date % time %', _new_date, _new_time;
    
    -- Block primary staff slots
    IF primary_staff_id IS NOT NULL THEN
        check_minutes := 0;
        WHILE check_minutes < primary_service_duration LOOP
            check_time := _new_time + (check_minutes || ' minutes')::interval;
            
            -- Block the slot (with override check if needed)
            IF _force_override THEN
                -- Force update even if slot is already occupied
                UPDATE staff_availability 
                SET available = FALSE, updated_at = now()
                WHERE staff_profile_id = primary_staff_id 
                AND date = _new_date 
                AND time_slot = check_time;
            ELSE
                -- Only update if slot is available
                UPDATE staff_availability 
                SET available = FALSE, updated_at = now()
                WHERE staff_profile_id = primary_staff_id 
                AND date = _new_date 
                AND time_slot = check_time
                AND available = TRUE;
                
                -- Check if update failed due to unavailability
                IF NOT FOUND THEN
                    RAISE EXCEPTION '[EDIT_DUAL_BOOKING] Primary staff % not available for date % at time %', 
                        primary_staff_id, _new_date, check_time;
                END IF;
            END IF;
            
            IF FOUND THEN
                slots_blocked := slots_blocked + 1;
            END IF;
            
            check_minutes := check_minutes + 10;
        END LOOP;
    END IF;
    
    -- Block secondary staff slots (if different from primary and exists)
    IF secondary_staff_id IS NOT NULL AND secondary_staff_id != primary_staff_id AND secondary_service_duration > 0 THEN
        check_minutes := 0;
        WHILE check_minutes < secondary_service_duration LOOP
            -- Secondary service starts after primary service
            check_time := _new_time + (primary_service_duration + check_minutes || ' minutes')::interval;
            
            -- Block the slot (with override check if needed)
            IF _force_override THEN
                -- Force update even if slot is already occupied
                UPDATE staff_availability 
                SET available = FALSE, updated_at = now()
                WHERE staff_profile_id = secondary_staff_id 
                AND date = _new_date 
                AND time_slot = check_time;
            ELSE
                -- Only update if slot is available
                UPDATE staff_availability 
                SET available = FALSE, updated_at = now()
                WHERE staff_profile_id = secondary_staff_id 
                AND date = _new_date 
                AND time_slot = check_time
                AND available = TRUE;
                
                -- Check if update failed due to unavailability
                IF NOT FOUND THEN
                    RAISE EXCEPTION '[EDIT_DUAL_BOOKING] Secondary staff % not available for date % at time %', 
                        secondary_staff_id, _new_date, check_time;
                END IF;
            END IF;
            
            IF FOUND THEN
                slots_blocked := slots_blocked + 1;
            END IF;
            
            check_minutes := check_minutes + 10;
        END LOOP;
    END IF;
    
    RAISE NOTICE '[EDIT_DUAL_BOOKING] Blocked % slots for new appointment', slots_blocked;

    -- 4. Log the edit event
    INSERT INTO appointment_events (appointment_id, event_type, notes)
    VALUES (
        _appointment_id, 
        'edited', 
        format('Dual-service appointment edited by admin. Duration: % -> % min, Date: % -> %, Time: % -> %, Primary staff: %, Secondary staff: %', 
            old_duration, new_total_duration, old_date, _new_date, old_time, _new_time, primary_staff_id, secondary_staff_id)
    );

    -- 5. Log admin action for audit trail
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO admin_actions (admin_user_id, action_type, target_appointment_id, details)
        VALUES (admin_user_id, 'edit_dual_booking', _appointment_id, 
                json_build_object(
                    'old_duration', old_duration,
                    'new_duration', new_total_duration,
                    'duration_change', new_total_duration - old_duration,
                    'old_date', old_date,
                    'new_date', _new_date,
                    'old_time', old_time,
                    'new_time', _new_time,
                    'primary_staff_id', primary_staff_id,
                    'secondary_staff_id', secondary_staff_id,
                    'primary_service_duration', primary_service_duration,
                    'secondary_service_duration', secondary_service_duration,
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
    RAISE NOTICE '[EDIT_DUAL_BOOKING] ✓ Completed dual-service edit for appointment %. Freed % slots, blocked % slots.', 
        _appointment_id, slots_freed, slots_blocked;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '[EDIT_DUAL_BOOKING] ✗ Dual-service edit failed for appointment %: % (SQLSTATE: %)', 
            _appointment_id, SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.edit_admin_booking_with_dual_services TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.edit_admin_booking_with_dual_services IS 
'Edits dual-service appointments with proper sequential staff availability management. Handles primary and secondary services with different staff and durations.';
