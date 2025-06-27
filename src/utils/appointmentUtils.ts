
import { supabase } from '@/integrations/supabase/client';

// Main appointment creation function using the new atomic booking system
export async function createAppointment(
  userId: string,
  petId: string,
  serviceId: string,
  providerId: string | null,
  date: Date,
  timeSlot: string,
  notes?: string
): Promise<boolean> {
  try {
    const isoDate = date.toISOString().split('T')[0];
    
    // Convert provider user_id to provider_profile id if needed
    let providerIds: string[] = [];
    
    if (providerId) {
      const { data: providerProfile, error: profileError } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', providerId)
        .single();

      if (profileError || !providerProfile) {
        throw new Error('Provider profile not found');
      }
      
      providerIds = [providerProfile.id];
    }

    // Use the new atomic booking function
    const { data: appointmentId, error } = await supabase.rpc('create_booking_atomic', {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _provider_ids: providerIds,
      _booking_date: isoDate,
      _time_slot: timeSlot,
      _notes: notes || null
    });

    if (error) {
      console.error('Booking error:', error);
      throw new Error(error.message || 'Failed to create booking');
    }

    if (!appointmentId) {
      throw new Error('No appointment ID returned');
    }

    return true;
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

// Helper function to get service resource requirements
export async function getServiceResources(serviceId: string) {
  try {
    const { data, error } = await supabase
      .from('service_resources')
      .select('*')
      .eq('service_id', serviceId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching service resources:', error);
    return [];
  }
}

// Helper function to check if service requires shower
export async function serviceRequiresShower(serviceId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('service_resources')
      .select('resource_type')
      .eq('service_id', serviceId)
      .eq('resource_type', 'shower')
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}
