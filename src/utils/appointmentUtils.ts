
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
      .select('name')
      .eq('id', selectedService)
      .single();

    // Try to get provider name from groomers table first, then veterinarians
    let providerName = 'Profissional';
    const { data: groomer } = await supabase
      .from('groomers')
      .select('name')
      .eq('id', selectedGroomerId)
      .single();

    if (groomer) {
      providerName = groomer.name;
    } else {
      const { data: vet } = await supabase
        .from('veterinarians')
        .select('name')
        .eq('id', selectedGroomerId)
        .single();
      
      if (vet) {
        providerName = vet.name;
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
    const { error } = await supabase
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
        notes: notes || null
      });

    if (error) throw error;

    toast.success('Agendamento realizado com sucesso!');
    return true;
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    toast.error('Erro ao criar agendamento');
    return false;
  }
};
