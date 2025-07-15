
-- Create atomic cancellation function with full slot reversion
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
    reverted_count integer := 0;
    total_expected integer;
BEGIN
    -- Calculate expected number of slot reversions
    total_expected := array_length(p_slots_to_revert, 1) * array_length(p_staff_ids, 1);
    
    RAISE NOTICE '[ATOMIC_CANCEL] Starting cancellation for appointment %, expecting % slot reversions', 
        p_appointment_id, total_expected;

    -- Begin atomic transaction (function is already in a transaction)
    
    -- 1. Update appointment status to cancelled
    UPDATE appointments 
    SET 
        status = 'cancelled',
        updated_at = now()
    WHERE id = p_appointment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment % not found for cancellation', p_appointment_id;
    END IF;
    
    RAISE NOTICE '[ATOMIC_CANCEL] Appointment % status updated to cancelled', p_appointment_id;

    -- 2. Revert all staff availability slots
    FOREACH staff_id IN ARRAY p_staff_ids LOOP
        FOREACH slot_time IN ARRAY p_slots_to_revert LOOP
            -- Update staff availability for this slot
            UPDATE staff_availability 
            SET 
                available = TRUE,
                updated_at = now()
            WHERE 
                staff_profile_id = staff_id 
                AND date = p_appointment_date 
                AND time_slot = slot_time::time;
            
            IF FOUND THEN
                reverted_count := reverted_count + 1;
                RAISE NOTICE '[ATOMIC_CANCEL] Reverted slot % for staff % on %', 
                    slot_time, staff_id, p_appointment_date;
            ELSE
                RAISE WARNING '[ATOMIC_CANCEL] Slot % for staff % on % not found or already available', 
                    slot_time, staff_id, p_appointment_date;
            END IF;
        END LOOP;
    END LOOP;

    -- 3. Log the cancellation event
    INSERT INTO appointment_events (appointment_id, event_type, notes, created_by)
    VALUES (
        p_appointment_id, 
        'cancelled', 
        format('Appointment cancelled atomically. Reverted %s/%s slots.', reverted_count, total_expected),
        null
    );

    -- 4. Log completion summary
    RAISE NOTICE '[ATOMIC_CANCEL] Completed cancellation for appointment %. Reverted %/% slots.', 
        p_appointment_id, reverted_count, total_expected;
    
    -- If we didn't revert the expected number of slots, log a warning but don't fail
    IF reverted_count != total_expected THEN
        RAISE WARNING '[ATOMIC_CANCEL] Expected to revert % slots but only reverted %. Some slots may have been already available.', 
            total_expected, reverted_count;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '[ATOMIC_CANCEL] Cancellation failed for appointment %: % (SQLSTATE: %)', 
            p_appointment_id, SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.atomic_cancel_appointment TO authenticated;

-- Update the logging function to handle larger data payloads
CREATE OR REPLACE FUNCTION public.log_cancellation_debug(
    p_appointment_id uuid,
    p_message text,
    p_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO appointment_events (
        appointment_id, 
        event_type, 
        notes, 
        created_by
    ) VALUES (
        p_appointment_id,
        'debug_log',
        format('[DEBUG] %s | Data: %s', p_message, COALESCE(p_data::text, 'null')),
        auth.uid()
    );
    
    -- Also log to PostgreSQL logs for server-side debugging
    RAISE NOTICE '[CANCELLATION_DEBUG] Appointment %: % | Data: %', 
        p_appointment_id, p_message, COALESCE(p_data::text, 'null');
    
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the main operation if logging fails
        RAISE WARNING '[CANCELLATION_DEBUG] Failed to log debug info for appointment %: %', 
            p_appointment_id, SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users  
GRANT EXECUTE ON FUNCTION public.log_cancellation_debug TO authenticated;
