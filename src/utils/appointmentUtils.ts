
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const createAppointment = async (
  userId: string,
  petId: string,
  serviceId: string,
  providerId: string,
  date: Date,
  timeSlot: string,
  notes?: string
) => {
  try {
    // Get pet and service details for the appointment
    const [petResult, serviceResult] = await Promise.all([
      supabase.from('pets').select('name').eq('id', petId).single(),
      supabase.from('services').select('name').eq('id', serviceId).single()
    ]);

    if (petResult.error) {
      console.error('Error fetching pet:', petResult.error);
      toast.error('Erro ao buscar informações do pet');
      return false;
    }

    if (serviceResult.error) {
      console.error('Error fetching service:', serviceResult.error);
      toast.error('Erro ao buscar informações do serviço');
      return false;
    }

    // Get user name from auth metadata or user_roles join
    const { data: { user } } = await supabase.auth.getUser();
    const ownerName = user?.user_metadata?.name || user?.email || 'Cliente';

    const dateStr = date.toISOString().split('T')[0];

    // Use the atomic reservation function to prevent double booking
    const { data: appointmentId, error } = await supabase.rpc('reserve_appointment_slot', {
      p_user_id: userId,
      p_pet_id: petId,
      p_service_id: serviceId,
      p_provider_id: providerId,
      p_date: dateStr,
      p_time: timeSlot,
      p_pet_name: petResult.data.name,
      p_owner_name: ownerName,
      p_service_name: serviceResult.data.name,
      p_notes: notes || null
    });

    if (error) {
      console.error('Error creating appointment:', error);
      if (error.message.includes('Slot no longer available')) {
        toast.error('Este horário não está mais disponível. Por favor, escolha outro horário.');
      } else if (error.message.includes('Provider not available')) {
        toast.error('O profissional não está disponível neste horário.');
      } else {
        toast.error('Erro ao criar agendamento: ' + error.message);
      }
      return false;
    }

    console.log('Appointment created successfully:', appointmentId);
    toast.success('Agendamento criado com sucesso!');
    return true;
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    toast.error('Erro inesperado ao criar agendamento');
    return false;
  }
};
