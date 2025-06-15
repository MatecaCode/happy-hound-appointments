
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const createAppointment = async (
  userId: string,
  petId: string,
  serviceId: string,
  providerId: string | null,
  date: Date,
  timeSlot: string,
  notes?: string
) => {
  try {
    // Get pet and service details
    const [petResult, serviceResult] = await Promise.all([
      supabase.from('pets').select('name').eq('id', petId).single(),
      supabase.from('services').select('service_type').eq('id', serviceId).single()
    ]);

    if (petResult.error) {
      toast.error('Erro ao buscar informações do pet');
      return false;
    }

    if (serviceResult.error) {
      toast.error('Erro ao buscar informações do serviço');
      return false;
    }

    // Get current user name if needed (not used here but left for future enhancements)
    // const { data: { user } } = await supabase.auth.getUser();
    // const ownerName = user?.user_metadata?.name || user?.email || 'Cliente';

    const dateStr = date.toISOString().split('T')[0];

    // Call atomic_create_appointment which does all required logic
    const { data: appointmentId, error } = await supabase.rpc('atomic_create_appointment', {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _provider_id: providerId, // nullable for shower-only
      _date: dateStr,
      _time: timeSlot,
      _notes: notes || null
    });

    if (error) {
      // Show a nice toast depending on error message if available
      let errorMsg = 'Erro ao criar agendamento';
      if (error.details) errorMsg += `: ${error.details}`;
      else if (error.message) errorMsg += `: ${error.message}`;
      toast.error(errorMsg);
      return false;
    }

    toast.success('Agendamento criado com sucesso!');
    return true;
  } catch (error: any) {
    toast.error('Erro inesperado ao criar agendamento');
    return false;
  }
};
