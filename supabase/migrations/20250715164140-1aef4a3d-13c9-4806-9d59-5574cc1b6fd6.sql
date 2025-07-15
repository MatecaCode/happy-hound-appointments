-- Enhanced atomic cancellation function with robust error handling and debugging
CREATE OR REPLACE FUNCTION public.atomic_cancel_appointment(
    p_appointment_id uuid,
    p_appointment_date date,
    p_slots_to_revert text[],
    p_staff_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    staff_id uuid;
    slot_time text;
    slot_time_parsed time;
    reverted_count integer := 0;
    total_expected integer;
    appointment_record record;
BEGIN
    -- Enhanced logging with input validation
    RAISE NOTICE '[ATOMIC_CANCEL] Starting cancellation for appointment %', p_appointment_id;
    RAISE NOTICE '[ATOMIC_CANCEL] Input parameters: date=%, slots=%, staff_ids=%', 
        p_appointment_date, p_slots_to_revert, p_staff_ids;
    
    -- Validate input parameters
    IF p_appointment_id IS NULL THEN
        RAISE EXCEPTION '[ATOMIC_CANCEL] Appointment ID cannot be NULL';
    END IF;
    
    IF p_appointment_date IS NULL THEN
        RAISE EXCEPTION '[ATOMIC_CANCEL] Appointment date cannot be NULL';
    END IF;
    
    IF p_slots_to_revert IS NULL OR array_length(p_slots_to_revert, 1) = 0 THEN
        RAISE EXCEPTION '[ATOMIC_CANCEL] Slots to revert cannot be NULL or empty';
    END IF;
    
    IF p_staff_ids IS NULL OR array_length(p_staff_ids, 1) = 0 THEN
        RAISE EXCEPTION '[ATOMIC_CANCEL] Staff IDs cannot be NULL or empty';
    END IF;

    -- Calculate expected number of slot reversions
    total_expected := array_length(p_slots_to_revert, 1) * array_length(p_staff_ids, 1);
    RAISE NOTICE '[ATOMIC_CANCEL] Expecting % slot reversions', total_expected;

    -- Verify appointment exists and get its details
    SELECT * INTO appointment_record 
    FROM appointments 
    WHERE id = p_appointment_id;
    
    IF appointment_record IS NULL THEN
        RAISE EXCEPTION '[ATOMIC_CANCEL] Appointment % not found', p_appointment_id;
    END IF;
    
    RAISE NOTICE '[ATOMIC_CANCEL] Found appointment: status=%, date=%, time=%', 
        appointment_record.status, appointment_record.date, appointment_record.time;

    -- 1. Update appointment status to cancelled
    UPDATE appointments 
    SET 
        status = 'cancelled',
        updated_at = now()
    WHERE id = p_appointment_id;
    
    RAISE NOTICE '[ATOMIC_CANCEL] Appointment % status updated to cancelled', p_appointment_id;

    -- 2. Revert all staff availability slots with enhanced error handling
    FOREACH staff_id IN ARRAY p_staff_ids LOOP
        RAISE NOTICE '[ATOMIC_CANCEL] Processing staff %', staff_id;
        
        FOREACH slot_time IN ARRAY p_slots_to_revert LOOP
            BEGIN
                -- Safely parse the time slot
                slot_time_parsed := slot_time::time;
                RAISE NOTICE '[ATOMIC_CANCEL] Processing slot % for staff %', slot_time, staff_id;
                
                -- Update staff availability for this slot
                UPDATE staff_availability 
                SET 
                    available = TRUE,
                    updated_at = now()
                WHERE 
                    staff_profile_id = staff_id 
                    AND date = p_appointment_date 
                    AND time_slot = slot_time_parsed;
                
                IF FOUND THEN
                    reverted_count := reverted_count + 1;
                    RAISE NOTICE '[ATOMIC_CANCEL] ✓ Reverted slot % for staff % on %', 
                        slot_time, staff_id, p_appointment_date;
                ELSE
                    RAISE WARNING '[ATOMIC_CANCEL] ⚠ Slot % for staff % on % not found or already available', 
                        slot_time, staff_id, p_appointment_date;
                END IF;
                
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING '[ATOMIC_CANCEL] ✗ Failed to process slot % for staff %: % (SQLSTATE: %)', 
                        slot_time, staff_id, SQLERRM, SQLSTATE;
                    -- Continue processing other slots instead of failing completely
            END;
        END LOOP;
    END LOOP;

    -- 3. Log the cancellation event
    INSERT INTO appointment_events (appointment_id, event_type, notes)
    VALUES (
        p_appointment_id, 
        'cancelled', 
        format('Appointment cancelled atomically. Reverted %s/%s slots.', reverted_count, total_expected)
    );

    -- 4. Log completion summary
    RAISE NOTICE '[ATOMIC_CANCEL] ✓ Completed cancellation for appointment %. Reverted %/% slots.', 
        p_appointment_id, reverted_count, total_expected;
    
    -- If we didn't revert the expected number of slots, log a warning but don't fail
    IF reverted_count != total_expected THEN
        RAISE WARNING '[ATOMIC_CANCEL] Expected to revert % slots but only reverted %. Some slots may have been already available.', 
            total_expected, reverted_count;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '[ATOMIC_CANCEL] ✗ Cancellation failed for appointment %: % (SQLSTATE: %)', 
            p_appointment_id, SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.atomic_cancel_appointment TO authenticated;