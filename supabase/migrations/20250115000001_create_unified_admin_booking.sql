-- Create unified admin booking RPC supporting all three scenarios
-- Scenario 1: Single service, single staff
-- Scenario 2: Two services, single staff (sequential)  
-- Scenario 3: Two services, two staff (sequential)

CREATE OR REPLACE FUNCTION public.create_unified_admin_booking(
  _booking_date date,
  _time_slot time without time zone,
  _pet_id uuid,
  _primary_service_id uuid,
  _provider_ids uuid[], -- pass staff ids; length 1 or 2
  _created_by uuid,
  _client_user_id uuid DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _secondary_service_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL,
  _extra_fee numeric DEFAULT 0,
  _extra_fee_reason text DEFAULT NULL,
  _addons jsonb DEFAULT '[]'::jsonb,
  _override_conflicts boolean DEFAULT FALSE
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt_id uuid;
  v_primary_staff uuid;
  v_secondary_staff uuid;
  v_dur_primary int;
  v_dur_secondary int;
  v_start timestamp;
  v_mid   timestamp;
  v_end   timestamp;
  v_expected int;
  v_updated int;
  v_client_id uuid;
BEGIN
  -- Admin-only guard as in existing creators (reuse is_admin(auth.uid()))
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin required' USING ERRCODE = 'P0001';
  END IF;

  -- Client guardrail for _client_id path
  IF _client_id IS NOT NULL THEN
    PERFORM 1 FROM public.clients c WHERE c.id = _client_id AND c.admin_created AND c.user_id IS NULL;
    IF NOT FOUND THEN 
      RAISE EXCEPTION 'Invalid _client_id for unified booking' USING ERRCODE = 'P0001'; 
    END IF;
    v_client_id := _client_id;
  ELSE
    -- Resolve client_id from _client_user_id
    SELECT id INTO v_client_id FROM public.clients WHERE user_id = _client_user_id LIMIT 1;
    IF v_client_id IS NULL THEN
      RAISE EXCEPTION 'No client found for user_id %', _client_user_id USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Validate provider_ids array
  IF array_length(_provider_ids, 1) IS NULL OR array_length(_provider_ids, 1) < 1 THEN
    RAISE EXCEPTION 'At least one staff member required' USING ERRCODE = 'P0001';
  END IF;

  -- Resolve staff mapping
  v_primary_staff := _provider_ids[1];
  v_secondary_staff := CASE 
    WHEN _secondary_service_id IS NULL THEN NULL 
    WHEN array_length(_provider_ids, 1) >= 2 THEN _provider_ids[2]
    ELSE _provider_ids[1] -- Same staff for both services (Scenario 2)
  END;

  -- Durations from services table
  SELECT COALESCE(default_duration, 0) INTO v_dur_primary FROM public.services WHERE id = _primary_service_id;
  IF v_dur_primary IS NULL OR v_dur_primary <= 0 THEN
    RAISE EXCEPTION 'Invalid primary service duration' USING ERRCODE = 'P0001';
  END IF;

  IF _secondary_service_id IS NOT NULL THEN
    SELECT COALESCE(default_duration, 0) INTO v_dur_secondary FROM public.services WHERE id = _secondary_service_id;
    IF v_dur_secondary IS NULL OR v_dur_secondary <= 0 THEN
      RAISE EXCEPTION 'Invalid secondary service duration' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    v_dur_secondary := 0;
  END IF;

  -- Calculate time windows
  v_start := (_booking_date::timestamp + _time_slot);
  v_mid   := v_start + make_interval(mins => v_dur_primary);
  v_end   := v_mid   + make_interval(mins => v_dur_secondary);

  -- Availability blocking (sequential)
  -- Case A: two different staff (Scenario 3)
  IF v_secondary_staff IS NOT NULL AND v_secondary_staff <> v_primary_staff THEN
    -- Primary staff block
    v_expected := GREATEST(0, v_dur_primary / 10);
    IF v_expected > 0 THEN
      UPDATE public.staff_availability sa
         SET available = FALSE
        FROM (SELECT generate_series(v_start, v_mid - interval '10 min', interval '10 min') ts) g
       WHERE sa.staff_profile_id = v_primary_staff
         AND sa.date = _booking_date
         AND sa.time_slot = g.ts::time
         AND sa.available = TRUE;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated < v_expected AND NOT _override_conflicts THEN
        RAISE EXCEPTION 'Primary staff not fully available (got %/% slots)', v_updated, v_expected USING ERRCODE = 'P0001';
      END IF;
    END IF;

    -- Secondary staff block
    v_expected := GREATEST(0, v_dur_secondary / 10);
    IF v_expected > 0 THEN
      UPDATE public.staff_availability sa
         SET available = FALSE
        FROM (SELECT generate_series(v_mid, v_end - interval '10 min', interval '10 min') ts) g
       WHERE sa.staff_profile_id = v_secondary_staff
         AND sa.date = _booking_date
         AND sa.time_slot = g.ts::time
         AND sa.available = TRUE;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated < v_expected AND NOT _override_conflicts THEN
        RAISE EXCEPTION 'Secondary staff not fully available (got %/% slots)', v_updated, v_expected USING ERRCODE = 'P0001';
      END IF;
    END IF;

  -- Case B: same staff does both OR single service (Scenarios 1 & 2)
  ELSE
    v_expected := GREATEST(0, (v_dur_primary + v_dur_secondary) / 10);
    IF v_expected > 0 THEN
      UPDATE public.staff_availability sa
         SET available = FALSE
        FROM (SELECT generate_series(v_start, COALESCE(v_end, v_mid) - interval '10 min', interval '10 min') ts) g
       WHERE sa.staff_profile_id = v_primary_staff
         AND sa.date = _booking_date
         AND sa.time_slot = g.ts::time
         AND sa.available = TRUE;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated < v_expected AND NOT _override_conflicts THEN
        RAISE EXCEPTION 'Staff not fully available for combined window (got %/% slots)', v_updated, v_expected USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  -- Create appointment
  INSERT INTO public.appointments (
    client_id, pet_id, date, time, duration, notes, created_by, 
    total_price, extra_fee, extra_fee_reason, status
  )
  VALUES (
    v_client_id, _pet_id, _booking_date, _time_slot,
    v_dur_primary + v_dur_secondary,
    _notes, _created_by, 
    0, -- Will be calculated from services
    COALESCE(_extra_fee, 0),
    _extra_fee_reason,
    'pending'
  )
  RETURNING id INTO v_appt_id;

  -- Appointment services
  INSERT INTO public.appointment_services(appointment_id, service_id, service_order, price, duration)
  SELECT v_appt_id, _primary_service_id, 1, s.base_price, v_dur_primary
  FROM public.services s WHERE s.id = _primary_service_id;

  IF _secondary_service_id IS NOT NULL THEN
    INSERT INTO public.appointment_services(appointment_id, service_id, service_order, price, duration)
    SELECT v_appt_id, _secondary_service_id, 2, s.base_price, v_dur_secondary
    FROM public.services s WHERE s.id = _secondary_service_id;
  END IF;

  -- Appointment staff (per service_id; same staff may appear twice for Scenario 2)
  INSERT INTO public.appointment_staff(appointment_id, service_id, staff_profile_id, role)
  VALUES (v_appt_id, _primary_service_id, v_primary_staff, 'assigned');

  IF _secondary_service_id IS NOT NULL THEN
    INSERT INTO public.appointment_staff(appointment_id, service_id, staff_profile_id, role)
    VALUES (v_appt_id, _secondary_service_id, COALESCE(v_secondary_staff, v_primary_staff), 'assigned');
  END IF;

  -- Update appointment total_price from services
  UPDATE public.appointments 
  SET total_price = (
    SELECT COALESCE(SUM(aps.price), 0) + COALESCE(_extra_fee, 0)
    FROM public.appointment_services aps 
    WHERE aps.appointment_id = v_appt_id
  )
  WHERE id = v_appt_id;

  -- TODO (optional): persist addons/_extra_fee_reason in addon tables if used in UI.

  RETURN v_appt_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_unified_admin_booking(
  date, time without time zone, uuid, uuid, uuid[], uuid, uuid, uuid, uuid, text, numeric, text, jsonb, boolean
) TO anon, authenticated, service_role;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
