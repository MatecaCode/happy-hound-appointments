
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

    const { data: provider } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', selectedGroomerId)
      .single();

    // Get user profile for owner name
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

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
        owner_name: userProfile?.name || 'Usuário',
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
