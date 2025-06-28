
-- Fix RLS policies for appointment_events to allow booking system to create audit logs
DROP POLICY IF EXISTS "Public read access" ON appointment_events;
DROP POLICY IF EXISTS "Admins can manage appointment events" ON appointment_events;

-- Allow users to insert events for their own appointments
CREATE POLICY "Users can create events for their appointments" 
  ON appointment_events 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE id = appointment_events.appointment_id 
      AND user_id = auth.uid()
    )
  );

-- Allow users to view events for their own appointments
CREATE POLICY "Users can view events for their appointments" 
  ON appointment_events 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE id = appointment_events.appointment_id 
      AND user_id = auth.uid()
    )
  );

-- Allow admins to manage all events
CREATE POLICY "Admins can manage all appointment events" 
  ON appointment_events 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Fix RLS policies for appointment_providers
DROP POLICY IF EXISTS "Public read access" ON appointment_providers;

-- Allow users to view providers for their own appointments
CREATE POLICY "Users can view providers for their appointments" 
  ON appointment_providers 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE id = appointment_providers.appointment_id 
      AND user_id = auth.uid()
    )
  );

-- Allow system to insert provider links during booking (via RPC function)
CREATE POLICY "System can create appointment providers" 
  ON appointment_providers 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE id = appointment_providers.appointment_id 
      AND user_id = auth.uid()
    )
  );

-- Allow admins to manage all appointment providers
CREATE POLICY "Admins can manage all appointment providers" 
  ON appointment_providers 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Ensure appointments table has proper RLS policies
DROP POLICY IF EXISTS "Clients see their own bookings" ON appointments;
DROP POLICY IF EXISTS "Providers see bookings assigned to them" ON appointments;
DROP POLICY IF EXISTS "Admins see all bookings" ON appointments;

-- Allow clients to view their own appointments
CREATE POLICY "Clients can view their own appointments"
  ON appointments
  FOR SELECT 
  USING (user_id = auth.uid());

-- Allow clients to create their own appointments
CREATE POLICY "Clients can create their own appointments"
  ON appointments
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Allow providers to view appointments assigned to them
CREATE POLICY "Providers can view their assigned appointments"
  ON appointments
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM appointment_providers ap
      JOIN provider_profiles pp ON ap.provider_id = pp.id
      WHERE ap.appointment_id = appointments.id
      AND pp.user_id = auth.uid()
    )
  );

-- Allow admins to manage all appointments
CREATE POLICY "Admins can manage all appointments"
  ON appointments
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Fix notification_queue RLS policies
DROP POLICY IF EXISTS "Users can view their notifications" ON notification_queue;

-- Allow users to view their own notifications
CREATE POLICY "Users can view their own notifications" 
  ON notification_queue 
  FOR SELECT 
  USING (recipient_id = auth.uid());

-- Allow system to create notifications during booking
CREATE POLICY "System can create notifications" 
  ON notification_queue 
  FOR INSERT 
  WITH CHECK (recipient_id = auth.uid());

-- Allow admins to manage all notifications
DROP POLICY IF EXISTS "Admins can manage notifications" ON notification_queue;
CREATE POLICY "Admins can manage all notifications" 
  ON notification_queue 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
