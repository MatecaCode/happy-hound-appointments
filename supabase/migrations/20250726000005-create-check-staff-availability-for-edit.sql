-- Create the missing check_staff_availability_for_edit function
-- This function checks availability for editing appointments with duration changes

CREATE OR REPLACE FUNCTION public.check_staff_availability_for_edit(
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
    staff_ids uuid[];
    service_duration integer;
    check_time time;
    check_minutes integer;
    total_slots integer;
    available_slots text[];
    unavailable_slots text[];
    unavailable_count integer := 0;
    is_fully_available boolean := true;
    end_time time;
BEGIN
    -- Get appointment details
    SELECT a.*, s.default_duration INTO appointment_record
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = _appointment_id;
    
    IF appointment_record IS NULL THEN
        RAISE EXCEPTION 'Appointment not found: %', _appointment_id;
    END IF;
    
    -- Get staff IDs for this appointment
    SELECT array_agg(staff_profile_id) INTO staff_ids
    FROM appointment_staff
    WHERE appointment_id = _appointment_id;
    
    -- Use provided duration or fall back to appointment duration
    IF _new_duration IS NOT NULL AND _new_duration > 0 THEN
        service_duration := _new_duration;
    ELSE
        service_duration := appointment_record.duration;
    END IF;
    
    total_slots := service_duration / 10;
    end_time := _new_time + (service_duration || ' minutes')::interval;
    
    -- Check each 10-minute slot
    check_minutes := 0;
    WHILE check_minutes < service_duration LOOP
        check_time := _new_time + (check_minutes || ' minutes')::interval;
        
        -- Check if any staff is available for this slot
        IF NOT EXISTS(
            SELECT 1 FROM staff_availability sa
            WHERE sa.staff_profile_id = ANY(staff_ids)
            AND sa.date = _new_date
            AND sa.time_slot = check_time
            AND sa.available = TRUE
        ) THEN
            unavailable_count := unavailable_count + 1;
            is_fully_available := false;
            unavailable_slots := array_append(unavailable_slots, check_time::text);
        ELSE
            available_slots := array_append(available_slots, check_time::text);
        END IF;
        
        check_minutes := check_minutes + 10;
    END LOOP;
    
    RETURN json_build_object(
        'total_slots', total_slots,
        'available_slots', available_slots,
        'unavailable_slots', unavailable_slots,
        'unavailable_count', unavailable_count,
        'is_fully_available', is_fully_available,
        'service_duration', service_duration,
        'start_time', _new_time::text,
        'end_time', end_time::text
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_staff_availability_for_edit TO authenticated; 