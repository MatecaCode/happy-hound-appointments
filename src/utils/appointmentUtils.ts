import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    console.log('🔍 DEBUG: Starting appointment creation with params:', {
      userId,
      petId,
      serviceId,
      providerId,
      date: date.toISOString(),
      timeSlot,
      notes
    });

    const isoDate = date.toISOString().split('T')[0];
    
    // Convert provider user_id to provider_profile id if needed
    let providerIds: string[] = [];
    
    if (providerId) {
      console.log('🔍 DEBUG: Converting provider user_id to provider_profile id...');
      const { data: providerProfile, error: profileError } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', providerId)
        .single();

      if (profileError || !providerProfile) {
        console.error('🚨 ERROR: Provider profile not found:', profileError);
        toast.error('Profissional não encontrado no sistema');
        throw new Error('Provider profile not found');
      }
      
      console.log('🔍 DEBUG: Found provider profile:', providerProfile);
      providerIds = [providerProfile.id];
    }

    console.log('🔍 DEBUG: Calling create_booking_atomic with:', {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _provider_ids: providerIds,
      _booking_date: isoDate,
      _time_slot: timeSlot,
      _notes: notes || null
    });

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

    console.log('🔍 DEBUG: create_booking_atomic response:', { appointmentId, error });

    if (error) {
      console.error('🚨 ERROR: Booking error from RPC:', error);
      
      // Show user-friendly error messages
      if (error.message.includes('not available')) {
        toast.error('Horário não disponível. Por favor, selecione outro horário.');
      } else if (error.message.includes('capacity exceeded')) {
        toast.error('Capacidade de banho excedida para este horário.');
      } else if (error.message.includes('conflicting appointment')) {
        toast.error('Profissional já tem compromisso neste horário.');
      } else {
        toast.error(`Erro ao criar agendamento: ${error.message}`);
      }
      
      throw new Error(error.message || 'Failed to create booking');
    }

    if (!appointmentId) {
      console.error('🚨 ERROR: No appointment ID returned from RPC');
      toast.error('Erro interno: ID do agendamento não foi retornado');
      throw new Error('No appointment ID returned');
    }

    console.log('✅ SUCCESS: Appointment created with ID:', appointmentId);
    toast.success('Agendamento criado com sucesso!');
    return true;

  } catch (error: any) {
    console.error('🚨 ERROR: Error in createAppointment function:', error);
    
    // Only show toast if we haven't already shown one
    if (!error.message?.includes('Provider profile not found') && 
        !error.message?.includes('not available') &&
        !error.message?.includes('capacity exceeded') &&
        !error.message?.includes('conflicting appointment')) {
      toast.error('Erro ao criar agendamento. Tente novamente.');
    }
    
    return false;
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
