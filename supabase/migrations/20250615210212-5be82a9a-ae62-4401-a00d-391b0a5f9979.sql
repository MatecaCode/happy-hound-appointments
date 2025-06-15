
-- 1. Create or replace a function that ensures atomic booking operation
-- This function will:
--   a) Check the service type ('shower_only', 'grooming', 'veterinary')
--   b) Check all required availability (provider_availability, shower_availability)
--   c) Insert the appointment if checks pass
--   d) Update shower_availability.available_spots if needed
--   e) Rollback all if any check fails

CREATE OR REPLACE FUNCTION public.atomic_create_appointment(
    _user_id uuid,
    _pet_id uuid,
    _service_id uuid,
    _provider_id uuid,
    _date date,
    _time time without time zone,
    _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    service_type text;
    appointment_id uuid := gen_random_uuid();
    shower_slot_id uuid;
    available_spots integer;
BEGIN
    -- Get the service type
    SELECT service_type INTO service_type FROM public.services WHERE id = _service_id;
    IF service_type IS NULL THEN
        RAISE EXCEPTION 'Invalid service_id—service not found';
    END IF;

    -- Grooming, shower-only, and veterinary logic
    IF service_type = 'shower_only' THEN
        -- Find a shower slot (must be available)
        SELECT id, available_spots INTO shower_slot_id, available_spots
        FROM public.shower_availability
        WHERE date = _date AND time_slot = _time FOR UPDATE;
        IF shower_slot_id IS NULL THEN
            RAISE EXCEPTION 'Nenhuma vaga de banho disponível neste horário';
        END IF;
        IF available_spots <= 0 THEN
            RAISE EXCEPTION 'Vagas de banho esgotadas para este horário';
        END IF;

        -- Insert appointment (provider_id may be NULL)
        INSERT INTO public.appointments(id, user_id, pet_id, service_id, provider_id, date, time, notes, status)
        VALUES (appointment_id, _user_id, _pet_id, _service_id, NULL, _date, _time, _notes, 'pending');
        -- Decrement spot
        UPDATE public.shower_availability SET available_spots = available_spots - 1 WHERE id = shower_slot_id;
        RETURN appointment_id;

    ELSIF service_type = 'grooming' THEN
        -- Check groomer is available (provider_availability record exists & available)
        IF _provider_id IS NULL THEN
            RAISE EXCEPTION 'Groomer must be selected for grooming service';
        END IF;
        -- Check provider_availability
        IF NOT EXISTS (
            SELECT 1 FROM public.provider_availability
             WHERE provider_id = _provider_id AND date = _date AND time_slot = _time AND available = true
        ) THEN
            RAISE EXCEPTION 'Profissional de tosa não disponível neste horário';
        END IF;
        -- Check shower availability (must be available)
        SELECT id, available_spots INTO shower_slot_id, available_spots
        FROM public.shower_availability
        WHERE date = _date AND time_slot = _time FOR UPDATE;
        IF shower_slot_id IS NULL THEN
            RAISE EXCEPTION 'Nenhuma vaga de banho disponível neste horário';
        END IF;
        IF available_spots <= 0 THEN
            RAISE EXCEPTION 'Vagas de banho esgotadas para este horário';
        END IF;

        -- Insert appointment for specific groomer, and decrement shower slot
        INSERT INTO public.appointments(id, user_id, pet_id, service_id, provider_id, date, time, notes, status)
        VALUES (appointment_id, _user_id, _pet_id, _service_id, _provider_id, _date, _time, _notes, 'pending');
        -- Decrement spot
        UPDATE public.shower_availability SET available_spots = available_spots - 1 WHERE id = shower_slot_id;
        RETURN appointment_id;

    ELSIF service_type = 'veterinary' THEN
        IF _provider_id IS NULL THEN
            RAISE EXCEPTION 'Veterinário deve ser selecionado';
        END IF;
        -- Check vet is available
        IF NOT EXISTS (
            SELECT 1 FROM public.provider_availability
             WHERE provider_id = _provider_id AND date = _date AND time_slot = _time AND available = true
        ) THEN
            RAISE EXCEPTION 'Veterinário não disponível neste horário';
        END IF;

        -- Insert appointment (no shower slot required)
        INSERT INTO public.appointments(id, user_id, pet_id, service_id, provider_id, date, time, notes, status)
        VALUES (appointment_id, _user_id, _pet_id, _service_id, _provider_id, _date, _time, _notes, 'pending');
        RETURN appointment_id;
    ELSE
        RAISE EXCEPTION 'Tipo de serviço desconhecido: %', service_type;
    END IF;
END;
$$;

-- Add a helpful comment for future maintainers
COMMENT ON FUNCTION public.atomic_create_appointment IS
'Atomically creates an appointment and decrements shower availability if needed, with full service-type branching. Raises exceptions if pre-checks fail.';

