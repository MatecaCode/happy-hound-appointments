
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

    // If it's a grooming service, also use shower resource
    if (service?.service_type === 'grooming') {
      resourceType = 'groomer'; // Primary resource is groomer for grooming services
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

    // Create booking capacity entry to track resource usage
    const { error: capacityError } = await supabase
      .from('booking_capacity')
      .insert({
        appointment_id: appointment.id,
        resource_type: resourceType,
        provider_id: selectedGroomerId,
        date: date.toISOString().split('T')[0],
        time_slot: selectedTimeSlotId
      });

    if (capacityError) throw capacityError;

    // If it's a grooming service, also book shower capacity
    if (service?.service_type === 'grooming') {
      const { error: showerCapacityError } = await supabase
        .from('booking_capacity')
        .insert({
          appointment_id: appointment.id,
          resource_type: 'shower',
          provider_id: null, // Shared resource
          date: date.toISOString().split('T')[0],
          time_slot: selectedTimeSlotId
        });

      if (showerCapacityError) throw showerCapacityError;
    }

    toast.success('Agendamento realizado com sucesso!');
    return true;
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    toast.error('Erro ao criar agendamento');
    return false;
  }
};
