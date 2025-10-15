-- Fix check_dual_staff_availability_for_edit function with robust data retrieval
-- This replaces the existing function with a simpler, more reliable approach

CREATE OR REPLACE FUNCTION public.check_dual_staff_availability_for_edit(
    _appointment_id uuid,
    _new_date date,
    _new_time time,
    _new_duration integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    appointment_record record;
    primary_service_id uuid;
    secondary_service_id uuid;
    primary_staff_id uuid;
    secondary_staff_id uuid;
    primary_service_duration integer;
    secondary_service_duration integer;
    primary_start_time time;
    secondary_start_time time;
    total_duration integer;
    check_time time;
    check_minutes integer;
    total_slots integer;
    available_slots text[];
    unavailable_slots text[];
    current_booking_slots text[];
    other_booking_slots text[];
    unavailable_count integer := 0;
    current_booking_count integer := 0;
    other_booking_count integer := 0;
    is_primary_available boolean := true;
    is_secondary_available boolean := true;
    is_fully_available boolean := true;
    is_same_booking boolean := false;
    end_time time;
    staff_availability_details jsonb[] := '{}';
    staff_detail jsonb;
    overall_status text;
    primary_staff_name text;
    secondary_staff_name text;
    primary_service_name text;
    secondary_service_name text;
BEGIN
    RAISE NOTICE '[DUAL_AVAILABILITY_CHECK] Starting validation for appointment % on date % at time %', _appointment_id, _new_date, _new_time;
    
    -- Get appointment details
    SELECT * INTO appointment_record FROM appointments WHERE id = _appointment_id;
    
    IF appointment_record IS NULL THEN
        RAISE EXCEPTION 'Appointment not found: %', _appointment_id;
    END IF;
    
    -- Check if this is the same booking (same date/time as current)
    IF appointment_record.date = _new_date AND appointment_record.time = _new_time THEN
        is_same_booking := true;
    END IF;
    
    -- Get primary service details (service_order = 1)
    SELECT 
        aps.service_id,
        s.default_duration,
        s.name,
        ast.staff_profile_id,
        sp.name
    INTO 
        primary_service_id,
        primary_service_duration,
        primary_service_name,
        primary_staff_id,
        primary_staff_name
    FROM appointment_services aps
    JOIN services s ON aps.service_id = s.id
    LEFT JOIN appointment_staff ast ON ast.appointment_id = aps.appointment_id AND ast.service_id = aps.service_id
    LEFT JOIN staff_profiles sp ON ast.staff_profile_id = sp.id
    WHERE aps.appointment_id = _appointment_id AND aps.service_order = 1;
    
    IF primary_service_id IS NULL THEN
        RAISE EXCEPTION 'Primary service not found for appointment: %', _appointment_id;
    END IF;
    
    RAISE NOTICE '[DUAL_AVAILABILITY_CHECK] Primary: service=% (%), duration=%min, staff=% (%)', 
        primary_service_id, primary_service_name, primary_service_duration, primary_staff_id, primary_staff_name;
    
    -- Get secondary service details (service_order = 2) if exists
    SELECT 
        aps.service_id,
        s.default_duration,
        s.name,
        ast.staff_profile_id,
        sp.name
    INTO 
        secondary_service_id,
        secondary_service_duration,
        secondary_service_name,
        secondary_staff_id,
        secondary_staff_name
    FROM appointment_services aps
    JOIN services s ON aps.service_id = s.id
    LEFT JOIN appointment_staff ast ON ast.appointment_id = aps.appointment_id AND ast.service_id = aps.service_id
    LEFT JOIN staff_profiles sp ON ast.staff_profile_id = sp.id
    WHERE aps.appointment_id = _appointment_id AND aps.service_order = 2;
    
    IF secondary_service_id IS NOT NULL THEN
        RAISE NOTICE '[DUAL_AVAILABILITY_CHECK] Secondary: service=% (%), duration=%min, staff=% (%)', 
            secondary_service_id, secondary_service_name, secondary_service_duration, secondary_staff_id, secondary_staff_name;
    ELSE
        secondary_service_duration := 0;
        RAISE NOTICE '[DUAL_AVAILABILITY_CHECK] No secondary service found';
    END IF;
    
    -- Calculate sequential timing
    primary_start_time := _new_time;
    secondary_start_time := _new_time + (primary_service_duration || ' minutes')::interval;
    
    -- Calculate total duration
    total_duration := primary_service_duration + COALESCE(secondary_service_duration, 0);
    total_slots := total_duration / 10;
    end_time := _new_time + (total_duration || ' minutes')::interval;
    
    RAISE NOTICE '[DUAL_AVAILABILITY_CHECK] Sequential timing: primary %->%, secondary %->%', 
        primary_start_time, 
        primary_start_time + (primary_service_duration || ' minutes')::interval,
        secondary_start_time,
        secondary_start_time + (COALESCE(secondary_service_duration, 0) || ' minutes')::interval;
    
    -- Check PRIMARY STAFF availability (from primary_start_time for primary_service_duration)
    IF primary_staff_id IS NOT NULL THEN
        RAISE NOTICE '[DUAL_AVAILABILITY_CHECK] Checking primary staff % from % for %min', primary_staff_id, primary_start_time, primary_service_duration;
        
        check_minutes := 0;
        WHILE check_minutes < primary_service_duration LOOP
            check_time := primary_start_time + (check_minutes || ' minutes')::interval;
            
            -- Check primary staff availability
            IF NOT EXISTS(
                SELECT 1 FROM staff_availability sa
                WHERE sa.staff_profile_id = primary_staff_id
                AND sa.date = _new_date
                AND sa.time_slot = check_time
                AND sa.available = TRUE
            ) THEN
                RAISE NOTICE '[DUAL_AVAILABILITY_CHECK] Primary staff % NOT available at %', primary_staff_id, check_time;
                
                -- Check if this slot is occupied by the current booking
                IF EXISTS(
                    SELECT 1 FROM appointments a
                    JOIN appointment_staff ast ON a.id = ast.appointment_id
                    WHERE ast.staff_profile_id = primary_staff_id
                    AND a.date = _new_date
                    AND a.time <= check_time
                    AND (a.time + (a.duration || ' minutes')::interval) > check_time
                    AND a.id = _appointment_id
                ) THEN
                    current_booking_count := current_booking_count + 1;
                    current_booking_slots := array_append(current_booking_slots, check_time::text);
                ELSE
                    other_booking_count := other_booking_count + 1;
                    other_booking_slots := array_append(other_booking_slots, check_time::text);
                    is_primary_available := false;
                END IF;
                
                unavailable_count := unavailable_count + 1;
                unavailable_slots := array_append(unavailable_slots, check_time::text);
            ELSE
                available_slots := array_append(available_slots, check_time::text);
            END IF;
            
            check_minutes := check_minutes + 10;
        END LOOP;
    END IF;
    
    -- Add primary staff availability details
    staff_detail := jsonb_build_object(
        'service_id', primary_service_id,
        'service_name', COALESCE(primary_service_name, 'Primary Service'),
        'service_order', 1,
        'staff_profile_id', primary_staff_id,
        'staff_name', COALESCE(primary_staff_name, 'Unknown'),
        'is_available', is_primary_available
    );
    staff_availability_details := array_append(staff_availability_details, staff_detail);
    
    -- Check SECONDARY STAFF availability if exists (from secondary_start_time for secondary_service_duration)
    IF secondary_staff_id IS NOT NULL AND secondary_service_duration > 0 THEN
        RAISE NOTICE '[DUAL_AVAILABILITY_CHECK] Checking secondary staff % from % for %min', secondary_staff_id, secondary_start_time, secondary_service_duration;
        
        check_minutes := 0;
        WHILE check_minutes < secondary_service_duration LOOP
            check_time := secondary_start_time + (check_minutes || ' minutes')::interval;
            
            -- Check secondary staff availability
            IF NOT EXISTS(
                SELECT 1 FROM staff_availability sa
                WHERE sa.staff_profile_id = secondary_staff_id
                AND sa.date = _new_date
                AND sa.time_slot = check_time
                AND sa.available = TRUE
            ) THEN
                RAISE NOTICE '[DUAL_AVAILABILITY_CHECK] Secondary staff % NOT available at %', secondary_staff_id, check_time;
                
                -- Check if this slot is occupied by the current booking
                IF EXISTS(
                    SELECT 1 FROM appointments a
                    JOIN appointment_staff ast ON a.id = ast.appointment_id
                    WHERE ast.staff_profile_id = secondary_staff_id
                    AND a.date = _new_date
                    AND a.time <= check_time
                    AND (a.time + (a.duration || ' minutes')::interval) > check_time
                    AND a.id = _appointment_id
                ) THEN
                    current_booking_count := current_booking_count + 1;
                    current_booking_slots := array_append(current_booking_slots, check_time::text);
                ELSE
                    other_booking_count := other_booking_count + 1;
                    other_booking_slots := array_append(other_booking_slots, check_time::text);
                    is_secondary_available := false;
                END IF;
                
                unavailable_count := unavailable_count + 1;
                unavailable_slots := array_append(unavailable_slots, check_time::text);
            ELSE
                available_slots := array_append(available_slots, check_time::text);
            END IF;
            
            check_minutes := check_minutes + 10;
        END LOOP;
        
        -- Add secondary staff availability details
        staff_detail := jsonb_build_object(
            'service_id', secondary_service_id,
            'service_name', COALESCE(secondary_service_name, 'Secondary Service'),
            'service_order', 2,
            'staff_profile_id', secondary_staff_id,
            'staff_name', COALESCE(secondary_staff_name, 'Unknown'),
            'is_available', is_secondary_available
        );
        staff_availability_details := array_append(staff_availability_details, staff_detail);
    END IF;
    
    -- Calculate overall availability status
    is_fully_available := is_primary_available AND (secondary_staff_id IS NULL OR is_secondary_available);
    
    IF is_fully_available THEN
        overall_status := 'Livre';
    ELSIF is_primary_available OR is_secondary_available THEN
        overall_status := 'Parcialmente Ocupado';
    ELSE
        overall_status := 'Ocupado';
    END IF;
    
    RAISE NOTICE '[DUAL_AVAILABILITY_CHECK] Final status: primary_available=%, secondary_available=%, overall=%', 
        is_primary_available, is_secondary_available, overall_status;
    
    RETURN json_build_object(
        'total_slots', total_slots,
        'available_slots', available_slots,
        'unavailable_slots', unavailable_slots,
        'current_booking_slots', current_booking_slots,
        'other_booking_slots', other_booking_slots,
        'unavailable_count', unavailable_count,
        'current_booking_count', current_booking_count,
        'other_booking_count', other_booking_count,
        'is_fully_available', is_fully_available,
        'is_primary_available', is_primary_available,
        'is_secondary_available', is_secondary_available,
        'overall_status', overall_status,
        'is_same_booking', is_same_booking,
        'service_duration', total_duration,
        'primary_service_duration', primary_service_duration,
        'secondary_service_duration', COALESCE(secondary_service_duration, 0),
        'primary_start_time', primary_start_time::text,
        'secondary_start_time', secondary_start_time::text,
        'start_time', _new_time::text,
        'end_time', end_time::text,
        'staff_availability', staff_availability_details
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_dual_staff_availability_for_edit TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.check_dual_staff_availability_for_edit IS 
'Validates staff availability for editing dual-service appointments with proper sequential timing. Fixed version with robust data retrieval and proper staff name resolution.';
