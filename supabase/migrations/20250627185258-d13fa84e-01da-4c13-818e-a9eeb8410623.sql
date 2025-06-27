
-- Phase 1A: Enhanced Booking System Database Schema

-- 1. Create service_resources table for mapping services to required resources
CREATE TABLE service_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('provider', 'shower')),
  provider_type TEXT CHECK (provider_type IN ('groomer', 'vet')),
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(service_id, resource_type, provider_type)
);

-- 2. Create appointment_providers table for multi-provider support
CREATE TABLE appointment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES provider_profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'primary' CHECK (role IN ('primary', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(appointment_id, provider_id)
);

-- 3. Create shower_settings table for dynamic capacity management
CREATE TABLE shower_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  max_spots INTEGER DEFAULT 5 CHECK (max_spots > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create appointment_events table for audit logging
CREATE TABLE appointment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'confirmed', 'cancelled', 'rejected', 'completed', 'modified')),
  notes TEXT,
  created_by UUID, -- admin user who made the change
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create notification_queue table for simple notifications
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user', 'provider', 'admin')),
  recipient_id UUID NOT NULL, -- user_id or provider user_id
  message_type TEXT NOT NULL CHECK (message_type IN ('booking_created', 'booking_confirmed', 'booking_cancelled', 'booking_rejected')),
  message TEXT NOT NULL,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create clinics table (placeholder for future multi-location support)
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Add duration_minutes to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30 CHECK (duration_minutes > 0);

-- 8. Update appointments table status constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'rejected', 'completed'));

-- 9. Function to get shower capacity for any date
CREATE OR REPLACE FUNCTION get_shower_capacity(target_date DATE) 
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT max_spots FROM shower_settings WHERE date = target_date),
    5 -- default capacity
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. Function to get available providers with appointment overlay
CREATE OR REPLACE FUNCTION get_available_providers(
  _service_id UUID,
  _date DATE,
  _time_slot TIME,
  _duration INTEGER DEFAULT 30
) RETURNS TABLE(
  provider_id UUID, 
  provider_type TEXT,
  user_id UUID
) AS $$
DECLARE
  end_time TIME;
BEGIN
  end_time := _time_slot + (_duration || ' minutes')::INTERVAL;
  
  RETURN QUERY
  SELECT DISTINCT pp.id, pp.type, pp.user_id
  FROM provider_profiles pp
  JOIN provider_availability pa ON pp.id = pa.provider_id
  JOIN service_resources sr ON sr.provider_type = pp.type AND sr.service_id = _service_id
  WHERE pa.date = _date
    AND pa.time_slot >= _time_slot
    AND pa.time_slot < end_time
    AND pa.available = true
    AND sr.resource_type = 'provider'
    AND NOT EXISTS (
      -- Overlay check: ensure no conflicting appointments
      SELECT 1 FROM appointments a
      JOIN appointment_providers ap ON a.id = ap.appointment_id
      JOIN services s ON a.service_id = s.id
      WHERE ap.provider_id = pp.id
        AND a.date = _date
        AND a.status NOT IN ('cancelled', 'rejected')
        AND (
          -- Check for time overlap
          (a.time < end_time AND (a.time + (COALESCE(s.duration_minutes, 30) || ' minutes')::INTERVAL) > _time_slot)
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. Enhanced atomic booking function with proper locking
CREATE OR REPLACE FUNCTION create_booking_atomic(
  _user_id UUID,
  _pet_id UUID,
  _service_id UUID,
  _provider_ids UUID[],
  _booking_date DATE,
  _time_slot TIME,
  _notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  appointment_id UUID := gen_random_uuid();
  service_duration INTEGER;
  end_time TIME;
  shower_capacity INTEGER;
  provider_id UUID;
  shower_slot RECORD;
  requires_shower BOOLEAN;
BEGIN
  -- Get service duration
  SELECT COALESCE(duration_minutes, 30) INTO service_duration 
  FROM services WHERE id = _service_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'Invalid service_id: service not found';
  END IF;
  
  end_time := _time_slot + (service_duration || ' minutes')::INTERVAL;
  
  -- Check if service requires shower
  SELECT EXISTS(
    SELECT 1 FROM service_resources 
    WHERE service_id = _service_id AND resource_type = 'shower'
  ) INTO requires_shower;
  
  -- 1. Lock and validate provider availability
  IF array_length(_provider_ids, 1) > 0 THEN
    FOREACH provider_id IN ARRAY _provider_ids LOOP
      -- Lock provider rows to prevent double-booking
      IF NOT EXISTS (
        SELECT 1 FROM provider_availability 
        WHERE provider_id = provider_id 
          AND date = _booking_date 
          AND time_slot >= _time_slot 
          AND time_slot < end_time
          AND available = true
        FOR UPDATE NOWAIT
      ) THEN
        RAISE EXCEPTION 'Provider % not available for requested time', provider_id;
      END IF;
      
      -- Check for existing appointments (overlay validation)
      IF EXISTS (
        SELECT 1 FROM appointments a
        JOIN appointment_providers ap ON a.id = ap.appointment_id
        JOIN services s ON a.service_id = s.id
        WHERE ap.provider_id = provider_id
          AND a.date = _booking_date
          AND a.status NOT IN ('cancelled', 'rejected')
          AND (a.time < end_time AND (a.time + (COALESCE(s.duration_minutes, 30) || ' minutes')::INTERVAL) > _time_slot)
      ) THEN
        RAISE EXCEPTION 'Provider % has conflicting appointment', provider_id;
      END IF;
    END LOOP;
  END IF;
  
  -- 2. Lock and validate shower availability if required
  IF requires_shower THEN
    shower_capacity := get_shower_capacity(_booking_date);
    
    -- Lock ALL shower slots for the duration
    FOR shower_slot IN 
      SELECT * FROM shower_availability 
      WHERE date = _booking_date 
        AND time_slot >= _time_slot 
        AND time_slot < end_time
      FOR UPDATE NOWAIT
    LOOP
      IF shower_slot.available_spots <= 0 THEN
        RAISE EXCEPTION 'Shower capacity exceeded for time slot %', shower_slot.time_slot;
      END IF;
    END LOOP;
  END IF;
  
  -- 3. Create appointment
  INSERT INTO appointments (id, user_id, pet_id, service_id, date, time, notes, status)
  VALUES (appointment_id, _user_id, _pet_id, _service_id, _booking_date, _time_slot, _notes, 'pending');
  
  -- 4. Link providers
  IF array_length(_provider_ids, 1) > 0 THEN
    FOREACH provider_id IN ARRAY _provider_ids LOOP
      INSERT INTO appointment_providers (appointment_id, provider_id)
      VALUES (appointment_id, provider_id);
    END LOOP;
  END IF;
  
  -- 5. Update shower availability (decrement spots) if required
  IF requires_shower THEN
    UPDATE shower_availability 
    SET available_spots = available_spots - 1
    WHERE date = _booking_date 
      AND time_slot >= _time_slot 
      AND time_slot < end_time;
  END IF;
  
  -- 6. Log the event
  INSERT INTO appointment_events (appointment_id, event_type, notes)
  VALUES (appointment_id, 'created', 'Booking created via system');
  
  -- 7. Queue notifications
  INSERT INTO notification_queue (appointment_id, recipient_type, recipient_id, message_type, message)
  VALUES (appointment_id, 'user', _user_id, 'booking_created', 'Your booking has been created and is pending confirmation.');
  
  RETURN appointment_id;
END;
$$ LANGUAGE plpgsql;

-- 12. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_resources_service_id ON service_resources(service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_providers_appointment_id ON appointment_providers(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_providers_provider_id ON appointment_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_appointment_events_appointment_id ON appointment_events(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON notification_queue(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_sent ON notification_queue(sent) WHERE sent = false;
CREATE INDEX IF NOT EXISTS idx_shower_settings_date ON shower_settings(date);

-- 13. Add RLS policies for new tables
ALTER TABLE service_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shower_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be refined later)
CREATE POLICY "Public read access" ON service_resources FOR SELECT USING (true);
CREATE POLICY "Public read access" ON appointment_providers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON shower_settings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON appointment_events FOR SELECT USING (true);
CREATE POLICY "Users can view their notifications" ON notification_queue FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Public read access" ON clinics FOR SELECT USING (true);

-- Admin policies (using existing has_role function)
CREATE POLICY "Admins can manage service resources" ON service_resources FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage shower settings" ON shower_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage appointment events" ON appointment_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage notifications" ON notification_queue FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage clinics" ON clinics FOR ALL USING (public.has_role(auth.uid(), 'admin'));
