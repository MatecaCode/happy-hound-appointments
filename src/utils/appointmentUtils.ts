
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const createAppointment = async (
  userId: string,
  selectedPet: string,
  selectedService: string,
  selectedGroomerId: string,
  date: Date,
  selectedTimeSlotId: string,
  notes: string
) => {
  try {
    // Get pet and service details
    const { data: pet } = await supabase
      .from('pets')
      .select('name')
      .eq('id', selectedPet)
      .single();

    const { data: service } = await supabase
      .from('services')
      .select('name, service_type')
      .eq('id', selectedService)
      .single();

    // Try to get provider name from groomers table first, then veterinarians
    let providerName = 'Profissional';
    let resourceType = 'groomer'; // default
    
    const { data: groomer } = await supabase
      .from('groomers')
      .select('name')
      .eq('id', selectedGroomerId)
      .single();

    if (groomer) {
      providerName = groomer.name;
      resourceType = 'groomer';
    } else {
      const { data: vet } = await supabase
        .from('veterinarians')
        .select('name')
        .eq('id', selectedGroomerId)
        .single();
      
      if (vet) {
        providerName = vet.name;
        resourceType = 'veterinary';
      }
    }

    // Get user profile for owner name from the appropriate table
    let ownerName = 'Usuário';
    
    // Check clients table first
    const { data: clientProfile } = await supabase
      .from('clients')
      .select('name')
      .eq('user_id', userId)
      .single();
      
    if (clientProfile) {
      ownerName = clientProfile.name;
    } else {
      // Check groomers table
      const { data: groomerProfile } = await supabase
        .from('groomers')
        .select('name')
        .eq('user_id', userId)
        .single();
        
      if (groomerProfile) {
        ownerName = groomerProfile.name;
      } else {
        // Check veterinarians table
        const { data: vetProfile } = await supabase
          .from('veterinarians')
          .select('name')
          .eq('user_id', userId)
          .single();
          
        if (vetProfile) {
          ownerName = vetProfile.name;
        }
      }
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        user_id: userId,
        pet_id: selectedPet,
        service_id: selectedService,
        provider_id: selectedGroomerId,
        date: date.toISOString().split('T')[0],
        time: selectedTimeSlotId,
        service: service?.name || '',
        pet_name: pet?.name || '',
        owner_name: ownerName,
        notes: notes || null,
        resource_type: resourceType
      })
      .select()
      .single();

    if (appointmentError) throw appointmentError;

    // Update availability by reducing capacity
    const dateStr = date.toISOString().split('T')[0];
    
    // Reduce provider availability
    const { error: providerError } = await supabase.rpc('reduce_availability_capacity', {
      p_resource_type: resourceType,
      p_provider_id: selectedGroomerId,
      p_date: dateStr,
      p_time_slot: selectedTimeSlotId
    });

    if (providerError) {
      console.error('Error reducing provider availability:', providerError);
    }

    // If it's a grooming service that requires a bath, also reduce shower capacity
    if (service?.service_type === 'grooming' && service?.name?.toLowerCase().includes('banho')) {
      const { error: showerError } = await supabase.rpc('reduce_availability_capacity', {
        p_resource_type: 'shower',
        p_provider_id: null,
        p_date: dateStr,
        p_time_slot: selectedTimeSlotId
      });

      if (showerError) {
        console.error('Error reducing shower availability:', showerError);
      }
    }

    toast.success('Agendamento realizado com sucesso!');
    return true;
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    toast.error('Erro ao criar agendamento');
    return false;
  }
};
