-- Fix create_admin_booking_with_dual_services function to properly handle secondary service data
-- This migration addresses the critical issues with secondary service price=0, duration=0, and availability blocking

CREATE OR REPLACE FUNCTION public.create_admin_booking_with_dual_services(
    _client_user_id uuid,
    _pet_id uuid,
    _primary_service_id uuid,
    _booking_date date,
    _time_slot time without time zone,
    _secondary_service_id uuid DEFAULT NULL,
    _calculated_price numeric DEFAULT NULL,
    _calculated_duration integer DEFAULT NULL,
    _notes text DEFAULT NULL,
    _provider_ids uuid[] DEFAULT NULL,
    _extra_fee numeric DEFAULT 0,
    _extra_fee_reason text DEFAULT NULL,
    _addons jsonb DEFAULT NULL,
    _created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    new_appointment_id UUID;
    client_id UUID;
    client_record RECORD;
    primary_service_record RECORD;
    secondary_service_record RECORD;
    service_duration INTEGER;
    final_price NUMERIC;
    primary_service_price NUMERIC;
    secondary_service_price NUMERIC;
    primary_service_duration_minutes INTEGER;
    secondary_service_duration_minutes INTEGER;
    primary_staff_id UUID;
    secondary_staff_id UUID;
    primary_staff_role TEXT;
    secondary_staff_role TEXT;
    v_upd1 INTEGER;
    v_upd2 INTEGER;
    check_minutes INTEGER;
    check_time TIME;
BEGIN
    RAISE NOTICE '[create_admin_booking_with_dual_services] === FUNCTION START ===';
    RAISE NOTICE '[create_admin_booking_with_dual_services] Params: client_user_id=%, pet_id=%, primary_service_id=%, secondary_service_id=%, date=%, time=%', 
        _client_user_id, _pet_id, _primary_service_id, _secondary_service_id, _booking_date, _time_slot;

    -- Get client_id from user_id
    SELECT * INTO client_record
    FROM clients c 
    WHERE c.user_id = _client_user_id;
    
    IF client_record IS NULL THEN
        RAISE EXCEPTION 'Client record not found for user: %', _client_user_id;
    END IF;
    
    client_id := client_record.id;
    RAISE NOTICE '[create_admin_booking_with_dual_services] Client found: id=%, name=%', client_id, client_record.name;

    -- Get primary service details
    SELECT * INTO primary_service_record
    FROM services s
    WHERE s.id = _primary_service_id;
    
    IF primary_service_record IS NULL THEN
        RAISE EXCEPTION 'Primary service not found: %', _primary_service_id;
    END IF;
    
    RAISE NOTICE '[create_admin_booking_with_dual_services] Primary service: name=%, price=%, duration=%', 
        primary_service_record.name, primary_service_record.base_price, primary_service_record.default_duration;

    -- Get secondary service details if provided
    IF _secondary_service_id IS NOT NULL THEN
        SELECT * INTO secondary_service_record
        FROM services s
        WHERE s.id = _secondary_service_id;
        
        IF secondary_service_record IS NULL THEN
            RAISE EXCEPTION 'Secondary service not found: %', _secondary_service_id;
        END IF;
        
        RAISE NOTICE '[create_admin_booking_with_dual_services] Secondary service: name=%, price=%, duration=%', 
            secondary_service_record.name, secondary_service_record.base_price, secondary_service_record.default_duration;
    ELSE
        RAISE NOTICE '[create_admin_booking_with_dual_services] No secondary service provided';
    END IF;

    -- FIXED: Extract service-specific data from DB (authoritative)
    primary_service_price := COALESCE(primary_service_record.base_price, 0);
    primary_service_duration_minutes := COALESCE(primary_service_record.default_duration, 60);
    
    -- FIXED: Load secondary service data explicitly
    IF _secondary_service_id IS NOT NULL THEN
        SELECT s.base_price, s.default_duration
        INTO secondary_service_price, secondary_service_duration_minutes
        FROM public.services s
        WHERE s.id = _secondary_service_id;

        IF secondary_service_price IS NULL OR secondary_service_duration_minutes IS NULL THEN
            RAISE EXCEPTION 'Secondary service % not found or missing data', _secondary_service_id
                USING ERRCODE = 'P0001';
        END IF;
        
        RAISE NOTICE '[create_admin_booking_with_dual_services] Secondary service extracted: price=%, duration=%', 
            secondary_service_price, secondary_service_duration_minutes;
    ELSE
        secondary_service_price := 0;
        secondary_service_duration_minutes := 0;
        RAISE NOTICE '[create_admin_booking_with_dual_services] Secondary service set to defaults: price=0, duration=0';
    END IF;

    RAISE NOTICE '[create_admin_booking_with_dual_services] Final service data: primary_price=%, primary_duration=%, secondary_price=%, secondary_duration=%', 
        primary_service_price, primary_service_duration_minutes, secondary_service_price, secondary_service_duration_minutes;

    -- Assert durations are multiples of 10 minutes
    IF primary_service_duration_minutes % 10 != 0 THEN
        RAISE EXCEPTION 'Primary service duration must be multiple of 10 minutes: %', primary_service_duration_minutes;
    END IF;
    
    IF secondary_service_duration_minutes > 0 AND secondary_service_duration_minutes % 10 != 0 THEN
        RAISE EXCEPTION 'Secondary service duration must be multiple of 10 minutes: %', secondary_service_duration_minutes;
    END IF;

    -- Determine service duration (always use DB-sourced durations)
    service_duration := primary_service_duration_minutes + secondary_service_duration_minutes;
    RAISE NOTICE '[create_admin_booking_with_dual_services] Total service duration: %min', service_duration;

    -- Determine final price
    IF _calculated_price IS NOT NULL AND _calculated_price > 0 THEN
        final_price := _calculated_price;
    ELSE
        final_price := primary_service_price + secondary_service_price;
    END IF;

    -- Add extra fee if provided
    IF _extra_fee IS NOT NULL AND _extra_fee > 0 THEN
        final_price := final_price + _extra_fee;
    END IF;
    
    RAISE NOTICE '[create_admin_booking_with_dual_services] Final price: R$ %', final_price;

    -- Validate staff availability if staff are specified
    IF array_length(_provider_ids, 1) > 0 THEN
        RAISE NOTICE '[create_admin_booking_with_dual_services] Validating staff availability for % staff members', array_length(_provider_ids, 1);
        
        -- For dual-service bookings, we need to validate availability differently
        IF _secondary_service_id IS NOT NULL AND array_length(_provider_ids, 1) > 1 THEN
            -- Validate primary staff for primary service duration
            primary_staff_id := _provider_ids[1];
            secondary_staff_id := _provider_ids[2];
            
            RAISE NOTICE '[create_admin_booking_with_dual_services] Dual service validation: primary_staff=%, secondary_staff=%', 
                primary_staff_id, secondary_staff_id;
            
            -- Check primary staff availability for primary service duration (slot by slot)
            check_minutes := 0;
            WHILE check_minutes < primary_service_duration_minutes LOOP
                check_time := _time_slot + (check_minutes || ' minutes')::interval;
                
                IF NOT EXISTS(
                    SELECT 1 FROM staff_availability 
                    WHERE staff_profile_id = primary_staff_id 
                    AND date = _booking_date 
                    AND time_slot = check_time 
                    AND available = TRUE
                ) THEN
                    RAISE EXCEPTION 'Primary staff % not available for date % at time %', primary_staff_id, _booking_date, check_time;
                END IF;
                
                check_minutes := check_minutes + 10;
            END LOOP;
            
            -- Check secondary staff availability for secondary service duration (starting after primary)
            check_minutes := 0;
            WHILE check_minutes < secondary_service_duration_minutes LOOP
                -- FIXED: Calculate correct offset time for secondary staff
                check_time := _time_slot + (primary_service_duration_minutes + check_minutes || ' minutes')::interval;
                
                RAISE NOTICE '[create_admin_booking_with_dual_services] Checking secondary staff % availability at %', secondary_staff_id, check_time;
                
                IF NOT EXISTS(
                    SELECT 1 FROM staff_availability 
                    WHERE staff_profile_id = secondary_staff_id 
                    AND date = _booking_date 
                    AND time_slot = check_time 
                    AND available = TRUE
                ) THEN
                    RAISE EXCEPTION 'Secondary staff % not available for date % at time %', secondary_staff_id, _booking_date, check_time;
                END IF;
                
                check_minutes := check_minutes + 10;
            END LOOP;
        ELSE
            -- Single service or single staff - validate for entire duration
            FOREACH primary_staff_id IN ARRAY _provider_ids LOOP
                -- Check if staff member exists
                IF NOT EXISTS(SELECT 1 FROM staff_profiles WHERE id = primary_staff_id) THEN
                    RAISE EXCEPTION 'Staff member not found: %', primary_staff_id;
                END IF;
                
                -- Check availability for the entire service duration (slot by slot)
                check_minutes := 0;
                WHILE check_minutes < service_duration LOOP
                    check_time := _time_slot + (check_minutes || ' minutes')::interval;
                    
                    IF NOT EXISTS(
                        SELECT 1 FROM staff_availability 
                        WHERE staff_profile_id = primary_staff_id 
                        AND date = _booking_date 
                        AND time_slot = check_time 
                        AND available = TRUE
                    ) THEN
                        RAISE EXCEPTION 'Staff % not available for date % at time %', primary_staff_id, _booking_date, check_time;
                    END IF;
                    
                    check_minutes := check_minutes + 10;
                END LOOP;
            END LOOP;
        END IF;
    END IF;

    RAISE NOTICE '[create_admin_booking_with_dual_services] Staff availability validation completed';

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
        duration,
        total_price,
        is_admin_override,
        created_by
    ) VALUES (
        client_id, 
        _pet_id, 
        _primary_service_id,
        _booking_date, 
        _time_slot, 
        _notes,
        'pending',
        'not_started',
        service_duration,
        final_price,
        FALSE,
        _created_by
    ) RETURNING id INTO new_appointment_id;
    
    RAISE NOTICE '[create_admin_booking_with_dual_services] Appointment created: id=%', new_appointment_id;

    -- Insert primary service into appointment_services
    INSERT INTO appointment_services (appointment_id, service_id, service_order, price, duration)
    VALUES (new_appointment_id, _primary_service_id, 1, primary_service_price, primary_service_duration_minutes);
    
    RAISE NOTICE '[create_admin_booking_with_dual_services] Primary service inserted: price=%, duration=%', 
        primary_service_price, primary_service_duration_minutes;

    -- Insert secondary service into appointment_services if provided
    IF _secondary_service_id IS NOT NULL THEN
        INSERT INTO appointment_services (appointment_id, service_id, service_order, price, duration)
        VALUES (new_appointment_id, _secondary_service_id, 2, secondary_service_price, secondary_service_duration_minutes);
        
        RAISE NOTICE '[create_admin_booking_with_dual_services] Secondary service inserted: price=%, duration=%', 
            secondary_service_price, secondary_service_duration_minutes;
    END IF;

    -- FIXED: Link staff to specific services
    IF array_length(_provider_ids, 1) > 0 THEN
        primary_staff_id := _provider_ids[1];
        IF array_length(_provider_ids, 1) > 1 THEN
            secondary_staff_id := _provider_ids[2];
        ELSE
            secondary_staff_id := _provider_ids[1];
        END IF;
        
        -- Determine roles based on service requirements
        IF primary_service_record.requires_bath THEN
            primary_staff_role := 'banhista';
        ELSIF primary_service_record.requires_grooming THEN
            primary_staff_role := 'tosador';
        ELSIF primary_service_record.requires_vet THEN
            primary_staff_role := 'veterinario';
        ELSE
            primary_staff_role := 'primary';
        END IF;
        
        -- FIXED: Use proper role for secondary staff based on service requirements
        IF secondary_service_record IS NOT NULL THEN
            IF secondary_service_record.requires_bath THEN
                secondary_staff_role := 'banhista';
            ELSIF secondary_service_record.requires_grooming THEN
                secondary_staff_role := 'tosador';
            ELSIF secondary_service_record.requires_vet THEN
                secondary_staff_role := 'veterinario';
            ELSE
                secondary_staff_role := 'assistant'; -- Use 'assistant' instead of 'secondary'
            END IF;
        ELSE
            secondary_staff_role := 'assistant'; -- Use 'assistant' instead of 'secondary'
        END IF;
        
        RAISE NOTICE '[create_admin_booking_with_dual_services] Staff roles: primary=% (%), secondary=% (%)', 
            primary_staff_id, primary_staff_role, secondary_staff_id, secondary_staff_role;
        
        -- Link primary staff to primary service
        INSERT INTO appointment_staff (appointment_id, staff_profile_id, role, service_id)
        VALUES (new_appointment_id, primary_staff_id, primary_staff_role, _primary_service_id);
        
        -- Link secondary staff to secondary service (if different staff)
        IF secondary_staff_id != primary_staff_id AND _secondary_service_id IS NOT NULL THEN
            INSERT INTO appointment_staff (appointment_id, staff_profile_id, role, service_id)
            VALUES (new_appointment_id, secondary_staff_id, secondary_staff_role, _secondary_service_id);
        END IF;
    END IF;

    -- FIXED: Block slots for staff members with proper secondary service duration
    IF array_length(_provider_ids, 1) > 0 THEN
        primary_staff_id := _provider_ids[1];
        IF array_length(_provider_ids, 1) > 1 THEN
            secondary_staff_id := _provider_ids[2];
        ELSE
            secondary_staff_id := _provider_ids[1];
        END IF;
        
        RAISE NOTICE '[create_admin_booking_with_dual_services] BLOCKING AVAILABILITY: primary_staff=%, secondary_staff=%, primary_duration=%min, secondary_duration=%min', 
            primary_staff_id, secondary_staff_id, primary_service_duration_minutes, secondary_service_duration_minutes;
        
        -- Block slots for primary staff (primary service duration)
        WITH slots AS (
            SELECT (_booking_date::timestamp + _time_slot + (i * interval '10 minutes'))::time AS slot_time
            FROM generate_series(0, (primary_service_duration_minutes/10) - 1) g(i)
        )
        UPDATE staff_availability sa
        SET available = FALSE, updated_at = now()
        FROM slots
        WHERE sa.staff_profile_id = primary_staff_id
          AND sa.date = _booking_date
          AND sa.time_slot = slots.slot_time;
        
        GET DIAGNOSTICS v_upd1 = ROW_COUNT;
        RAISE NOTICE '[create_admin_booking_with_dual_services] Primary staff blocked: % slots updated', v_upd1;
        
        -- FIXED: Ensure secondary UPDATE uses correct timing and checks row_count
        IF secondary_service_duration_minutes > 0 AND _secondary_service_id IS NOT NULL THEN
            RAISE NOTICE '[create_admin_booking_with_dual_services] Blocking secondary staff slots: duration=%min, offset=%min', 
                secondary_service_duration_minutes, primary_service_duration_minutes;
                
            WITH slots AS (
                SELECT (_booking_date::timestamp + _time_slot + (primary_service_duration_minutes * interval '1 minute') + (i * interval '10 minutes'))::time AS slot_time
                FROM generate_series(0, (secondary_service_duration_minutes/10) - 1) g(i)
            )
            UPDATE staff_availability sa
            SET available = FALSE, updated_at = now()
            FROM slots
            WHERE sa.staff_profile_id = secondary_staff_id
              AND sa.date = _booking_date
              AND sa.time_slot = slots.slot_time;
            
            GET DIAGNOSTICS v_upd2 = ROW_COUNT;
            RAISE NOTICE '[create_admin_booking_with_dual_services] Secondary staff blocked: % slots updated', v_upd2;
            
            -- Verify row count matches expected slots
            IF v_upd2 < (secondary_service_duration_minutes / 10) THEN
                RAISE NOTICE '[create_admin_booking_with_dual_services] WARNING: Expected % secondary slots, but only % were updated', 
                    (secondary_service_duration_minutes / 10), v_upd2;
            END IF;
        ELSE
            v_upd2 := 0;
            RAISE NOTICE '[create_admin_booking_with_dual_services] No secondary staff blocking needed (duration=%)', secondary_service_duration_minutes;
        END IF;
    END IF;

    RAISE NOTICE '[create_admin_booking_with_dual_services] === FUNCTION COMPLETE === Appointment ID: %', new_appointment_id;
    RETURN new_appointment_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[create_admin_booking_with_dual_services] === ERROR === %', SQLERRM;
        RAISE;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.create_admin_booking_with_dual_services IS 
'Creates an admin booking with support for dual services. FIXED: Properly extracts secondary service data, blocks secondary staff availability, and assigns correct roles.';
