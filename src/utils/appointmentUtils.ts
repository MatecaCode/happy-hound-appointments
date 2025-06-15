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

    // If the stored procedure isn't available, create appointment directly
    // TODO: If custom Supabase function is installed, use it here
    const { data: insertData, error } = await supabase
      .from('appointments')
      .insert([{
        user_id: userId,
        pet_id: petId,
        service_id: serviceId,
        provider_id: providerId,
        date: dateStr,
        time: timeSlot,
        notes: notes || null,
        status: 'pending'
      }]);

    if (error) {
      console.error('Error creating appointment:', error);
      toast.error('Erro ao criar agendamento: ' + error.message);
      return false;
    }

    console.log('Appointment created successfully:', insertData);
    toast.success('Agendamento criado com sucesso!');
    return true;
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    toast.error('Erro inesperado ao criar agendamento');
    return false;
  }
};
