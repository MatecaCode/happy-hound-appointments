
-- Remove all existing problematic RLS policies that cause recursion
DROP POLICY IF EXISTS "Users can create events for their appointments" ON appointment_events;
DROP POLICY IF EXISTS "Users can view events for their appointments" ON appointment_events;
DROP POLICY IF EXISTS "Admins can manage all appointment events" ON appointment_events;
DROP POLICY IF EXISTS "System can insert appointment events" ON appointment_events;

DROP POLICY IF EXISTS "Users can view providers for their appointments" ON appointment_providers;
DROP POLICY IF EXISTS "System can create appointment providers" ON appointment_providers;
DROP POLICY IF EXISTS "System can insert appointment providers" ON appointment_providers;
DROP POLICY IF EXISTS "Admins can manage all appointment providers" ON appointment_providers;
DROP POLICY IF EXISTS "Users can view appointment providers" ON appointment_providers;

DROP POLICY IF EXISTS "Clients can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Clients can create their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Providers can view their assigned appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON appointments;

DROP POLICY IF EXISTS "Users can view their notifications" ON notification_queue;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notification_queue;
DROP POLICY IF EXISTS "System can create notifications" ON notification_queue;
DROP POLICY IF EXISTS "System can insert notifications" ON notification_queue;
DROP POLICY IF EXISTS "Admins can manage notifications" ON notification_queue;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notification_queue;

DROP POLICY IF EXISTS "Users can manage their own pets" ON pets;

-- Drop availability table policies to recreate them properly
DROP POLICY IF EXISTS "Authenticated users can read provider availability" ON provider_availability;
DROP POLICY IF EXISTS "Authenticated users can read shower availability" ON shower_availability;
DROP POLICY IF EXISTS "Authenticated users can read services" ON services;
DROP POLICY IF EXISTS "Authenticated users can read service resources" ON service_resources;
DROP POLICY IF EXISTS "Authenticated users can read provider profiles" ON provider_profiles;

-- 1. APPOINTMENTS TABLE - Simple user-based policies only (NO RECURSION)
CREATE POLICY "Users can view their own appointments"
  ON appointments
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own appointments"
  ON appointments
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own appointments"
  ON appointments
  FOR UPDATE 
  USING (user_id = auth.uid());

-- 2. APPOINTMENT_PROVIDERS TABLE - System can insert freely, users can view
CREATE POLICY "System can insert appointment providers"
  ON appointment_providers
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view appointment providers"
  ON appointment_providers
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE id = appointment_providers.appointment_id 
      AND user_id = auth.uid()
    )
  );

-- 3. APPOINTMENT_EVENTS TABLE - System can insert freely, users can view
CREATE POLICY "System can insert appointment events"
  ON appointment_events
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view appointment events"
  ON appointment_events
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE id = appointment_events.appointment_id 
      AND user_id = auth.uid()
    )
  );

-- 4. NOTIFICATION_QUEUE TABLE - System can insert freely, users view their own
CREATE POLICY "System can insert notifications"
  ON notification_queue
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their own notifications"
  ON notification_queue
  FOR SELECT 
  USING (recipient_id = auth.uid());

-- 5. ADMIN POLICIES - Admins can manage everything
CREATE POLICY "Admins can manage all appointments"
  ON appointments
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all appointment providers"
  ON appointment_providers
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all appointment events"
  ON appointment_events
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all notifications"
  ON notification_queue
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. ENSURE AVAILABILITY TABLES ARE READABLE (needed for booking selection)
CREATE POLICY "Authenticated users can read provider availability" 
  ON provider_availability 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can read shower availability" 
  ON shower_availability 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can read services" 
  ON services 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can read service resources" 
  ON service_resources 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can read provider profiles" 
  ON provider_profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- 7. PETS TABLE - Users manage their own pets
CREATE POLICY "Users can manage their own pets"
  ON pets
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
