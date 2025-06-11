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
    console.log('🔧 Creating appointment...');
    console.log('📋 Parameters:', {
      userId,
      selectedPet,
      selectedService,
      selectedGroomerId,
      date: date.toISOString().split('T')[0],
      selectedTimeSlotId,
      notes
    });

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

    console.log('✅ Appointment created successfully:', appointment);
    toast.success('Agendamento realizado com sucesso!');
    return true;
    
  } catch (error: any) {
    console.error('💥 Error creating appointment:', error);
    toast.error('Erro ao criar agendamento: ' + error.message);
    return false;
  }
};

// Helper function to determine required resources for a service (keeping for compatibility)
export const getRequiredResources = (serviceType: string, serviceName: string): string[] => {
  const resources: string[] = [];
  
  if (serviceType === 'grooming') {
    resources.push('groomer');
    // If service includes bath, also need shower capacity (future enhancement)
    if (serviceName.toLowerCase().includes('banho')) {
      resources.push('shower');
    }
  } else if (serviceType === 'veterinary') {
    resources.push('veterinary');
  }
  
  return resources;
};
