-- Add service flow timestamps and RPC to centralize service_status writes
-- Guardrails respected: do not change availability/indexes or staff mapping; leave lifecycle status unchanged

-- 1) Columns (idempotent)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS service_completed_at timestamptz;

-- 2) Function: appointment_set_service_status
--   - Transitions: not_started -> in_progress -> completed (idempotent on same value)
--   - Sets timestamps on first transition to in_progress/completed
--   - Logs appointment_events(event_type='service_status_changed')
--   - Queues notification on completed (client recipient)
--   - Permission: admin or assigned staff (via appointment_staff -> staff_profiles.user_id)
CREATE OR REPLACE FUNCTION public.appointment_set_service_status(
  p_appointment_id uuid,
  p_new_status text,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_current text;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_client_id uuid;
  v_actor uuid := auth.uid();
  v_allowed boolean := false;
  v_now timestamptz := now();
BEGIN
  -- Validate input
  IF p_appointment_id IS NULL THEN
    RAISE EXCEPTION 'appointment_id is required';
  END IF;

  IF p_new_status NOT IN ('not_started','in_progress','completed') THEN
    RAISE EXCEPTION 'Invalid service status: %', p_new_status;
  END IF;

  -- Load current state
  SELECT service_status, service_started_at, service_completed_at, client_id
  INTO v_current, v_started_at, v_completed_at, v_client_id
  FROM public.appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    v_current := 'not_started';
  END IF;

  -- Permission: admins OR staff assigned to the appointment
  v_allowed := public.is_admin(v_actor)
    OR EXISTS (
      SELECT 1
      FROM public.appointment_staff ast
      JOIN public.staff_profiles sp ON sp.id = ast.staff_profile_id
      WHERE ast.appointment_id = p_appointment_id
        AND sp.user_id = v_actor
    );

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized to change service status for this appointment';
  END IF;

  -- Transition rules (idempotent on same value)
  IF p_new_status = v_current THEN
    -- No-op but still log an event for traceability
    INSERT INTO public.appointment_events (appointment_id, event_type, notes, created_by)
    VALUES (
      p_appointment_id,
      'service_status_changed',
      jsonb_build_object('from', v_current, 'to', p_new_status, 'note', p_note, 'idempotent', true)::text,
      v_actor
    );
    RETURN;
  END IF;

  -- Only allow forward progression
  IF p_new_status = 'not_started' AND v_current <> 'not_started' THEN
    RAISE EXCEPTION 'Cannot revert service status to not_started from %', v_current;
  END IF;

  IF p_new_status = 'in_progress' AND v_current NOT IN ('not_started','in_progress') THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', v_current, p_new_status;
  END IF;

  IF p_new_status = 'completed' AND v_current NOT IN ('in_progress','completed') THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', v_current, p_new_status;
  END IF;

  -- Apply update and timestamps
  UPDATE public.appointments
  SET
    service_status = p_new_status,
    service_started_at = CASE
      WHEN p_new_status = 'in_progress' AND service_started_at IS NULL THEN v_now
      ELSE service_started_at
    END,
    service_completed_at = CASE
      WHEN p_new_status = 'completed' AND service_completed_at IS NULL THEN v_now
      ELSE service_completed_at
    END,
    updated_at = v_now
  WHERE id = p_appointment_id;

  -- Log event
  INSERT INTO public.appointment_events (appointment_id, event_type, notes, created_by)
  VALUES (
    p_appointment_id,
    'service_status_changed',
    jsonb_build_object('from', v_current, 'to', p_new_status, 'note', p_note)::text,
    v_actor
  );

  -- Optional: queue notification on completion
  IF p_new_status = 'completed' AND v_client_id IS NOT NULL THEN
    INSERT INTO public.notification_queue (appointment_id, recipient_type, recipient_id, message_type, message)
    VALUES (p_appointment_id, 'user', v_client_id, 'booking_completed', 'Seu serviço foi concluído. Obrigado!');
  END IF;
END;
$$;

-- 3) Grants
GRANT EXECUTE ON FUNCTION public.appointment_set_service_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.appointment_set_service_status(uuid, text, text) TO anon;


