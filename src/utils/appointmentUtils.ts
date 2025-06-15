import { supabase } from '@/integrations/supabase/client';

// Main appointment creation function
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
    // Fetch service type first!
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('service_type')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      throw new Error('Serviço não encontrado');
    }

    const serviceType = service.service_type as 'shower_only' | 'grooming' | 'veterinary';

    // Convert date/time
    const isoDate = date.toISOString().split('T')[0];

    // Helper: get provider_profile id for groomer/vet if needed 
    let providerProfileId = providerId;
    if (
      (serviceType === 'grooming' || serviceType === 'veterinary') &&
      providerId
    ) {
      // Must get the provider_profiles.id (profile PK, not user_id)
      const { data: prof, error: profError } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', providerId)
        .eq('type', serviceType === 'grooming' ? 'groomer' : 'vet')
        .single();
      if (prof && prof.id) providerProfileId = prof.id;
      else throw new Error('Profissional não encontrado');
    }

    // --- Main booking logic ---
    if (serviceType === 'shower_only') {
      // 1. check spot in shower_availability only
      const { data: spots, error: spotErr } = await supabase
        .from('shower_availability')
        .select('id, available_spots')
        .eq('date', isoDate)
        .eq('time_slot', timeSlot)
        .single();

      if (spotErr || !spots || spots.available_spots <= 0) {
        throw new Error('Nenhuma vaga de banho disponível para este horário');
      }

      // Insert with provider_id null
      const { error } = await supabase.from('appointments').insert([{
        user_id: userId,
        pet_id: petId,
        service_id: serviceId,
        provider_id: null,
        date: isoDate,
        time: timeSlot,
        notes,
        status: 'upcoming'
      }]);
      if (error) throw error;

      // Decrement spot (optimistically)
      await supabase
        .from('shower_availability')
        .update({ available_spots: (spots.available_spots || 1) - 1 })
        .eq('id', spots.id);
    } else if (serviceType === 'grooming') {
      // Grooming: check provider_availability and shower_availability
      // 1. provider_availability (groomer)
      const { data: avail, error: availErr } = await supabase
        .from('provider_availability')
        .select('available')
        .eq('provider_id', providerProfileId)
        .eq('date', isoDate)
        .eq('time_slot', timeSlot)
        .single();

      if (availErr || !avail || avail.available === false) {
        throw new Error('Tosador não disponível nesse horário');
      }

      // 2. shower slots
      const { data: spots, error: spotErr } = await supabase
        .from('shower_availability')
        .select('id, available_spots')
        .eq('date', isoDate)
        .eq('time_slot', timeSlot)
        .single();

      if (spotErr || !spots || spots.available_spots <= 0) {
        throw new Error('Nenhuma vaga de banho disponível para este horário');
      }

      // Insert, with correct provider_id (provider_profiles.id)
      const { error } = await supabase.from('appointments').insert([{
        user_id: userId,
        pet_id: petId,
        service_id: serviceId,
        provider_id: providerProfileId,
        date: isoDate,
        time: timeSlot,
        notes,
        status: 'upcoming'
      }]);
      if (error) throw error;

      // Decrement shower spot
      await supabase
        .from('shower_availability')
        .update({ available_spots: (spots.available_spots || 1) - 1 })
        .eq('id', spots.id);

    } else if (serviceType === 'veterinary') {
      // Vet: only check provider_availability
      const { data: avail, error: availErr } = await supabase
        .from('provider_availability')
        .select('available')
        .eq('provider_id', providerProfileId)
        .eq('date', isoDate)
        .eq('time_slot', timeSlot)
        .single();

      if (availErr || !avail || avail.available === false) {
        throw new Error('Veterinário não disponível nesse horário');
      }

      // Insert
      const { error } = await supabase.from('appointments').insert([{
        user_id: userId,
        pet_id: petId,
        service_id: serviceId,
        provider_id: providerProfileId,
        date: isoDate,
        time: timeSlot,
        notes,
        status: 'upcoming'
      }]);
      if (error) throw error;
    } else {
      throw new Error('Tipo de serviço não suportado');
    }
    return true;
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    throw err;
  }
}
