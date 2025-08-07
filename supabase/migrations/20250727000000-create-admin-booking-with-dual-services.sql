-- Create the create_admin_booking_with_dual_services function for admin booking with multiple services
-- This function handles dual-service bookings and populates appointment_services table

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
    staff_id UUID;
    service_duration INTEGER;
    final_price NUMERIC;
    end_time TIME;
    check_time TIME;
    check_minutes INTEGER;
    client_id UUID;
    client_record RECORD;
    service_record RECORD;
    primary_service_record RECORD;
    secondary_service_record RECORD;
    required_roles TEXT[];
    role TEXT;
    slot_was_originally_available BOOLEAN;
    override_slots_created INTEGER := 0;
    service_order INTEGER := 1;
    addon_record RECORD;
    primary_staff_id UUID;
    secondary_staff_id UUID;
    current_time TIME;
    slot_minutes INTEGER;
    primary_service_price NUMERIC;
    secondary_service_price NUMERIC;
    primary_service_duration_minutes INTEGER;
    secondary_service_duration_minutes INTEGER;
    current_offset_minutes INTEGER;
    primary_staff_role TEXT;
    secondary_staff_role TEXT;
BEGIN
    -- Enhanced logging for debugging
    RAISE NOTICE '[create_admin_booking_with_dual_services] CALLED with params: client_user_id=%, pet_id=%, primary_service_id=%, secondary_service_id=%, booking_date=%, time_slot=%, calculated_price=%, calculated_duration=%, notes=%, provider_ids=%, extra_fee=%, created_by=%', 
        _client_user_id, _pet_id, _primary_service_id, _secondary_service_id, _booking_date, _time_slot, _calculated_price, _calculated_duration, _notes, _provider_ids, _extra_fee, _created_by;

    -- Validate required parameters
    IF _client_user_id IS NULL THEN
        RAISE EXCEPTION 'Client user ID is required';
    END IF;
    
    IF _pet_id IS NULL THEN
        RAISE EXCEPTION 'Pet ID is required';
    END IF;
    
    IF _primary_service_id IS NULL THEN
        RAISE EXCEPTION 'Primary service ID is required';
    END IF;
    
    IF _booking_date IS NULL THEN
        RAISE EXCEPTION 'Booking date is required';
    END IF;
    
    IF _time_slot IS NULL THEN
        RAISE EXCEPTION 'Time slot is required';
    END IF;

    -- Get client_id from user_id
    SELECT * INTO client_record
    FROM clients c 
    WHERE c.user_id = _client_user_id;
    
    IF client_record IS NULL THEN
        RAISE EXCEPTION 'Client record not found for user: %', _client_user_id;
    END IF;
    
    client_id := client_record.id;
    RAISE NOTICE '[create_admin_booking_with_dual_services] Found client: id=%, user_id=%, name=%', client_id, client_record.user_id, client_record.name;

    -- Get primary service details
    SELECT * INTO primary_service_record
    FROM services s
    WHERE s.id = _primary_service_id;
    
    IF primary_service_record IS NULL THEN
        RAISE EXCEPTION 'Primary service not found: %', _primary_service_id;
    END IF;

    -- Get secondary service details if provided
    IF _secondary_service_id IS NOT NULL THEN
        SELECT * INTO secondary_service_record
        FROM services s
        WHERE s.id = _secondary_service_id;
        
        IF secondary_service_record IS NULL THEN
            RAISE EXCEPTION 'Secondary service not found: %', _secondary_service_id;
        END IF;
    END IF;

    -- Extract service-specific data
    primary_service_price := COALESCE(primary_service_record.base_price, 0);
    primary_service_duration_minutes := COALESCE(primary_service_record.default_duration, 60);
    
    IF secondary_service_record IS NOT NULL THEN
        secondary_service_price := COALESCE(secondary_service_record.base_price, 0);
        secondary_service_duration_minutes := COALESCE(secondary_service_record.default_duration, 60);
    ELSE
        secondary_service_price := 0;
        secondary_service_duration_minutes := 0;
    END IF;

    RAISE NOTICE '[create_admin_booking_with_dual_services] SERVICE DATA: primary_price=%, primary_duration=%min, secondary_price=%, secondary_duration=%min', 
        primary_service_price, primary_service_duration_minutes, secondary_service_price, secondary_service_duration_minutes;

    -- Determine required roles based on both services
    required_roles := ARRAY[]::TEXT[];
    
    -- Add roles from primary service
    IF primary_service_record.requires_bath THEN
        required_roles := array_append(required_roles, 'banhista');
    END IF;
    IF primary_service_record.requires_grooming THEN
        required_roles := array_append(required_roles, 'tosador');
    END IF;
    IF primary_service_record.requires_vet THEN
        required_roles := array_append(required_roles, 'veterinario');
    END IF;
    
    -- Add roles from secondary service
    IF secondary_service_record IS NOT NULL THEN
        IF secondary_service_record.requires_bath THEN
            required_roles := array_append(required_roles, 'banhista');
        END IF;
        IF secondary_service_record.requires_grooming THEN
            required_roles := array_append(required_roles, 'tosador');
        END IF;
        IF secondary_service_record.requires_vet THEN
            required_roles := array_append(required_roles, 'veterinario');
        END IF;
    END IF;
    
    -- Remove duplicates
    required_roles := array(SELECT DISTINCT unnest(required_roles));
    
    RAISE NOTICE '[create_admin_booking_with_dual_services] Service requires roles: %', required_roles;

    -- Determine service duration
    IF _calculated_duration IS NOT NULL AND _calculated_duration > 0 THEN
        service_duration := _calculated_duration;
        RAISE NOTICE '[create_admin_booking_with_dual_services] Using calculated duration: % minutes', service_duration;
    ELSE
        -- Calculate total duration from both services
        service_duration := primary_service_duration_minutes + secondary_service_duration_minutes;
        RAISE NOTICE '[create_admin_booking_with_dual_services] Using calculated service duration: % minutes', service_duration;
    END IF;

    -- Determine final price
    IF _calculated_price IS NOT NULL AND _calculated_price > 0 THEN
        final_price := _calculated_price;
        RAISE NOTICE '[create_admin_booking_with_dual_services] Using calculated price: R$ %', final_price;
    ELSE
        -- Calculate total price from both services
        final_price := primary_service_price + secondary_service_price;
        RAISE NOTICE '[create_admin_booking_with_dual_services] Using calculated service price: R$ %', final_price;
    END IF;

    -- Add extra fee if provided
    IF _extra_fee IS NOT NULL AND _extra_fee > 0 THEN
        final_price := final_price + _extra_fee;
        RAISE NOTICE '[create_admin_booking_with_dual_services] Added extra fee: R$ % (total: R$ %)', _extra_fee, final_price;
    END IF;

    -- Calculate end time
    end_time := _time_slot + (service_duration || ' minutes')::INTERVAL;
    RAISE NOTICE '[create_admin_booking_with_dual_services] TIME CALCULATION: start_time=%, duration=% minutes, end_time=%', 
        _time_slot, service_duration, end_time;

    -- Validate staff availability if staff are specified
    IF array_length(_provider_ids, 1) > 0 THEN
        -- For dual-service bookings, we need to validate availability differently
        IF _secondary_service_id IS NOT NULL AND array_length(_provider_ids, 1) > 1 THEN
            -- Validate primary staff for primary service duration
            primary_staff_id := _provider_ids[1];
            secondary_staff_id := _provider_ids[2];
            
            -- Check primary staff availability for primary service duration
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
                check_time := _time_slot + (primary_service_duration_minutes + check_minutes || ' minutes')::interval;
                
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
            FOREACH staff_id IN ARRAY _provider_ids LOOP
                RAISE NOTICE '[create_admin_booking_with_dual_services] VALIDATING STAFF AVAILABILITY: staff_id=%', staff_id;
                
                -- Check if staff member exists
                IF NOT EXISTS(SELECT 1 FROM staff_profiles WHERE id = staff_id) THEN
                    RAISE EXCEPTION 'Staff member not found: %', staff_id;
                END IF;
                
                -- Check availability for the entire service duration
                check_minutes := 0;
                WHILE check_minutes < service_duration LOOP
                    check_time := _time_slot + (check_minutes || ' minutes')::interval;
                    
                    IF NOT EXISTS(
                        SELECT 1 FROM staff_availability 
                        WHERE staff_profile_id = staff_id 
                        AND date = _booking_date 
                        AND time_slot = check_time 
                        AND available = TRUE
                    ) THEN
                        RAISE EXCEPTION 'Staff % not available for date % at time %', staff_id, _booking_date, check_time;
                    END IF;
                    
                    check_minutes := check_minutes + 10;
                END LOOP;
                
                RAISE NOTICE '[create_admin_booking_with_dual_services] STAFF AVAILABILITY: CONFIRMED for staff_id=%', staff_id;
            END LOOP;
        END IF;
    END IF;

    -- Create the appointment with the primary service as the main service_id
    INSERT INTO appointments (
        client_id, 
        pet_id, 
        service_id,  -- Use primary service as the main service
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
        _primary_service_id,  -- Primary service as main service
        _booking_date, 
        _time_slot, 
        _notes,
        'pending',
        'not_started',
        service_duration,
        final_price,
        TRUE,
        _created_by
    ) RETURNING id INTO new_appointment_id;
    
    RAISE NOTICE '[create_admin_booking_with_dual_services] APPOINTMENT CREATED: id=%, client_id=%, duration=%, price=%', 
        new_appointment_id, client_id, service_duration, final_price;

    -- Insert primary service into appointment_services with price and duration
    INSERT INTO appointment_services (appointment_id, service_id, service_order, price, duration)
    VALUES (new_appointment_id, _primary_service_id, 1, primary_service_price, primary_service_duration_minutes);
    
    RAISE NOTICE '[create_admin_booking_with_dual_services] PRIMARY SERVICE LINKED: appointment_id=%, service_id=%, order=1, price=%, duration=%min', 
        new_appointment_id, _primary_service_id, primary_service_price, primary_service_duration_minutes;

    -- Insert secondary service into appointment_services if provided
    IF _secondary_service_id IS NOT NULL THEN
        INSERT INTO appointment_services (appointment_id, service_id, service_order, price, duration)
        VALUES (new_appointment_id, _secondary_service_id, 2, secondary_service_price, secondary_service_duration_minutes);
        
        RAISE NOTICE '[create_admin_booking_with_dual_services] SECONDARY SERVICE LINKED: appointment_id=%, service_id=%, order=2, price=%, duration=%min', 
            new_appointment_id, _secondary_service_id, secondary_service_price, secondary_service_duration_minutes;
    END IF;

    -- IMPROVED: Link staff to specific services and assign roles
    IF array_length(_provider_ids, 1) > 0 THEN
        -- Assign staff to services (first staff gets primary, second gets secondary)
        primary_staff_id := _provider_ids[1];
        secondary_staff_id := array_length(_provider_ids, 1) > 1 ? _provider_ids[2] : _provider_ids[1];
        
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
        
        IF secondary_service_record IS NOT NULL THEN
            IF secondary_service_record.requires_bath THEN
                secondary_staff_role := 'banhista';
            ELSIF secondary_service_record.requires_grooming THEN
                secondary_staff_role := 'tosador';
            ELSIF secondary_service_record.requires_vet THEN
                secondary_staff_role := 'veterinario';
            ELSE
                secondary_staff_role := 'secondary';
            END IF;
        ELSE
            secondary_staff_role := 'secondary';
        END IF;
        
        -- Link primary staff to primary service
        INSERT INTO appointment_staff (appointment_id, staff_profile_id, role, service_id)
        VALUES (new_appointment_id, primary_staff_id, primary_staff_role, _primary_service_id);
        
        RAISE NOTICE '[create_admin_booking_with_dual_services] PRIMARY STAFF LINKED: appointment_id=%, staff_id=%, role=%, service_id=%', 
            new_appointment_id, primary_staff_id, primary_staff_role, _primary_service_id;
        
        -- Link secondary staff to secondary service (if different staff)
        IF secondary_staff_id != primary_staff_id AND _secondary_service_id IS NOT NULL THEN
            INSERT INTO appointment_staff (appointment_id, staff_profile_id, role, service_id)
            VALUES (new_appointment_id, secondary_staff_id, secondary_staff_role, _secondary_service_id);
            
            RAISE NOTICE '[create_admin_booking_with_dual_services] SECONDARY STAFF LINKED: appointment_id=%, staff_id=%, role=%, service_id=%', 
                new_appointment_id, secondary_staff_id, secondary_staff_role, _secondary_service_id;
        END IF;
    END IF;

    -- IMPROVED: Block slots for staff members based on service assignments with proper offset logic
    IF array_length(_provider_ids, 1) > 0 THEN
        -- Assign staff to services (first staff gets primary, second gets secondary)
        primary_staff_id := _provider_ids[1];
        secondary_staff_id := array_length(_provider_ids, 1) > 1 ? _provider_ids[2] : _provider_ids[1];
        
        RAISE NOTICE '[create_admin_booking_with_dual_services] AVAILABILITY BLOCKING: primary_staff=%, secondary_staff=%, primary_duration=%min, secondary_duration=%min', 
            primary_staff_id, secondary_staff_id, primary_service_duration_minutes, secondary_service_duration_minutes;
        
        -- Block slots for primary staff (primary service duration)
        slot_minutes := 0;
        WHILE slot_minutes < primary_service_duration_minutes LOOP
            current_time := _time_slot + (slot_minutes || ' minutes')::interval;
            
            UPDATE staff_availability sa
            SET available = FALSE
            WHERE sa.staff_profile_id = primary_staff_id 
            AND sa.date = _booking_date 
            AND sa.time_slot = current_time;
            
            RAISE NOTICE '[create_admin_booking_with_dual_services] BLOCKED PRIMARY SLOT: staff_id=%, time=%', primary_staff_id, current_time;
            
            slot_minutes := slot_minutes + 10;
        END LOOP;
        
        -- Block slots for secondary staff (secondary service duration, starting after primary)
        IF secondary_service_duration_minutes > 0 AND _secondary_service_id IS NOT NULL THEN
            current_offset_minutes := primary_service_duration_minutes;
            slot_minutes := 0;
            WHILE slot_minutes < secondary_service_duration_minutes LOOP
                current_time := _time_slot + (current_offset_minutes + slot_minutes || ' minutes')::interval;
                
                UPDATE staff_availability sa
                SET available = FALSE
                WHERE sa.staff_profile_id = secondary_staff_id 
                AND sa.date = _booking_date 
                AND sa.time_slot = current_time;
                
                RAISE NOTICE '[create_admin_booking_with_dual_services] BLOCKED SECONDARY SLOT: staff_id=%, time=%', secondary_staff_id, current_time;
                
                slot_minutes := slot_minutes + 10;
            END LOOP;
        END IF;
        
        RAISE NOTICE '[create_admin_booking_with_dual_services] AVAILABILITY BLOCKING COMPLETE: primary_staff=% blocked for %min, secondary_staff=% blocked for %min', 
            primary_staff_id, primary_service_duration_minutes, secondary_staff_id, secondary_service_duration_minutes;
    END IF;

    -- Insert add-ons if provided
    IF _addons IS NOT NULL AND jsonb_array_length(_addons) > 0 THEN
        FOR addon_record IN SELECT * FROM jsonb_array_elements(_addons)
        LOOP
            INSERT INTO appointment_addons (
                appointment_id,
                addon_id,
                quantity,
                custom_description,
                price,
                added_by
            ) VALUES (
                new_appointment_id,
                (addon_record->>'addon_id')::uuid,
                (addon_record->>'quantity')::integer,
                addon_record->>'custom_description',
                (addon_record->>'price')::numeric,
                _created_by
            );
            
            RAISE NOTICE '[create_admin_booking_with_dual_services] ADDON INSERTED: appointment_id=%, addon_id=%', 
                new_appointment_id, addon_record->>'addon_id';
        END LOOP;
    END IF;

    -- Log the event
    INSERT INTO appointment_events (appointment_id, event_type, notes)
    VALUES (new_appointment_id, 'created', 'Admin booking created with dual services');

    -- Queue notifications for the client
    INSERT INTO notification_queue (appointment_id, recipient_type, recipient_id, message_type, message)
    VALUES (new_appointment_id, 'user', _client_user_id, 'booking_created', 
        CASE 
            WHEN _secondary_service_id IS NOT NULL THEN 
                'Seu agendamento com múltiplos serviços foi criado e está pendente de confirmação.'
            ELSE 
                'Seu agendamento foi criado e está pendente de confirmação.'
        END
    );

    RAISE NOTICE '[create_admin_booking_with_dual_services] SUCCESS: appointment_id=%', new_appointment_id;
    RETURN new_appointment_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[create_admin_booking_with_dual_services] ERROR: % - %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.create_admin_booking_with_dual_services IS 
'Creates an admin booking with support for multiple services, populating appointment_services table with proper service order'; 