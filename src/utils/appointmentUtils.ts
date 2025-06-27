
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
    console.log('🚀 BOOKING AUDIT: Starting appointment creation with params:', {
      userId,
      petId,
      serviceId,
      providerId,
      date: date.toISOString(),
      timeSlot,
      notes,
      timestamp: new Date().toISOString()
    });

    const isoDate = date.toISOString().split('T')[0];
    
    // STEP 1: Service validation and resource requirements check
    console.log('📋 STEP 1: Validating service and checking requirements...');
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (serviceError || !serviceData) {
      console.error('❌ SERVICE ERROR: Service not found:', serviceError);
      toast.error('Serviço não encontrado');
      return false;
    }

    console.log('✅ SERVICE FOUND:', serviceData);

    // Check service resource requirements
    const { data: serviceResources, error: resourceError } = await supabase
      .from('service_resources')
      .select('*')
      .eq('service_id', serviceId);

    if (resourceError) {
      console.error('❌ RESOURCE ERROR: Failed to fetch service resources:', resourceError);
    }

    console.log('🔧 SERVICE RESOURCES:', serviceResources || []);
    
    const requiresShower = (serviceResources || []).some(r => r.resource_type === 'shower' && r.required);
    const requiresProvider = (serviceResources || []).some(r => r.resource_type === 'provider' && r.required);
    
    console.log('📊 REQUIREMENTS ANALYSIS:', {
      requiresShower,
      requiresProvider,
      hasProviderId: !!providerId
    });

    // STEP 2: Provider validation and conversion
    let providerIds: string[] = [];
    
    if (providerId && requiresProvider) {
      console.log('👤 STEP 2: Converting provider user_id to provider_profile id...');
      const { data: providerProfile, error: profileError } = await supabase
        .from('provider_profiles')
        .select('id, user_id, type')
        .eq('user_id', providerId)
        .single();

      if (profileError || !providerProfile) {
        console.error('❌ PROVIDER ERROR: Provider profile not found for user_id:', providerId, profileError);
        toast.error('Profissional não encontrado no sistema');
        return false;
      }
      
      console.log('✅ PROVIDER PROFILE FOUND:', providerProfile);
      providerIds = [providerProfile.id];
    } else if (requiresProvider && !providerId) {
      console.error('❌ VALIDATION ERROR: Service requires provider but none provided');
      toast.error('Este serviço requer seleção de profissional');
      return false;
    }

    // STEP 3: Pre-flight availability checks
    console.log('🔍 STEP 3: Pre-flight availability checks...');
    
    if (requiresShower) {
      const { data: showerAvailability, error: showerError } = await supabase
        .from('shower_availability')
        .select('*')
        .eq('date', isoDate)
        .eq('time_slot', timeSlot)
        .single();

      console.log('🚿 SHOWER AVAILABILITY CHECK:', {
        date: isoDate,
        timeSlot,
        availability: showerAvailability,
        error: showerError
      });

      if (showerError || !showerAvailability || showerAvailability.available_spots <= 0) {
        console.error('❌ SHOWER UNAVAILABLE:', { showerError, availability: showerAvailability });
        toast.error('Horário de banho não disponível');
        return false;
      }
    }

    if (providerIds.length > 0) {
      for (const providerProfileId of providerIds) {
        const { data: providerAvail, error: providerError } = await supabase
          .from('provider_availability')
          .select('*')
          .eq('provider_id', providerProfileId)
          .eq('date', isoDate)
          .eq('time_slot', timeSlot)
          .single();

        console.log('👨‍⚕️ PROVIDER AVAILABILITY CHECK:', {
          providerProfileId,
          date: isoDate,
          timeSlot,
          availability: providerAvail,
          error: providerError
        });

        if (providerError || !providerAvail || !providerAvail.available) {
          console.error('❌ PROVIDER UNAVAILABLE:', { providerError, availability: providerAvail });
          toast.error('Profissional não disponível neste horário');
          return false;
        }
      }
    }

    // STEP 4: Call the atomic booking RPC
    console.log('🔄 STEP 4: Calling create_booking_atomic RPC with final params:', {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _provider_ids: providerIds,
      _booking_date: isoDate,
      _time_slot: timeSlot,
      _notes: notes || null
    });

    const { data: appointmentId, error } = await supabase.rpc('create_booking_atomic', {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _provider_ids: providerIds,
      _booking_date: isoDate,
      _time_slot: timeSlot,
      _notes: notes || null
    });

    console.log('📞 RPC RESPONSE:', { appointmentId, error });

    if (error) {
      console.error('❌ RPC ERROR: Booking failed:', error);
      
      // Enhanced error message mapping
      if (error.message.includes('not available') || error.message.includes('Provider') && error.message.includes('not available')) {
        toast.error('Profissional não disponível para o horário selecionado.');
      } else if (error.message.includes('capacity exceeded') || error.message.includes('Shower capacity exceeded')) {
        toast.error('Capacidade de banho excedida para este horário.');
      } else if (error.message.includes('conflicting appointment')) {
        toast.error('Profissional já tem compromisso neste horário.');
      } else if (error.message.includes('Invalid service_id')) {
        toast.error('Serviço inválido selecionado.');
      } else if (error.message.includes('Vagas de banho esgotadas')) {
        toast.error('Vagas de banho esgotadas para este horário.');
      } else if (error.message.includes('Nenhuma vaga de banho disponível')) {
        toast.error('Nenhuma vaga de banho disponível neste horário.');
      } else {
        console.error('❌ UNKNOWN ERROR TYPE:', error.message);
        toast.error(`Erro específico: ${error.message}`);
      }
      
      return false;
    }

    if (!appointmentId) {
      console.error('❌ NO APPOINTMENT ID: RPC succeeded but returned no ID');
      toast.error('Erro interno: ID do agendamento não foi retornado');
      return false;
    }

    // STEP 5: Verify the booking was created
    console.log('✅ STEP 5: Verifying booking creation...');
    const { data: createdAppointment, error: verifyError } = await supabase
      .from('appointments')
      .select(`
        *,
        appointment_providers (
          provider_id,
          provider_profiles (
            user_id,
            type
          )
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (verifyError || !createdAppointment) {
      console.error('❌ VERIFICATION FAILED: Appointment not found after creation:', verifyError);
      toast.error('Erro na verificação do agendamento criado');
      return false;
    }

    console.log('🎉 BOOKING SUCCESS: Complete appointment record:', createdAppointment);
    
    // STEP 6: Check related table updates
    const { data: events } = await supabase
      .from('appointment_events')
      .select('*')
      .eq('appointment_id', appointmentId);

    const { data: notifications } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('appointment_id', appointmentId);

    console.log('📝 RELATED RECORDS CREATED:', {
      events: events || [],
      notifications: notifications || []
    });

    toast.success('Agendamento criado com sucesso!');
    return true;

  } catch (error: any) {
    console.error('💥 CRITICAL ERROR: Unexpected error in createAppointment:', error);
    console.error('ERROR STACK:', error.stack);
    
    toast.error('Erro crítico no sistema de agendamento');
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

// Debug function to audit current system state
export async function auditBookingSystemState() {
  console.log('🔍 SYSTEM STATE AUDIT:');
  
  try {
    // Check services and their resources
    const { data: services } = await supabase.from('services').select('*');
    const { data: serviceResources } = await supabase.from('service_resources').select('*');
    
    console.log('📋 SERVICES:', services);
    console.log('🔧 SERVICE RESOURCES:', serviceResources);
    
    // Check availability data for today
    const today = new Date().toISOString().split('T')[0];
    const { data: showerAvail } = await supabase
      .from('shower_availability')
      .select('*')
      .eq('date', today)
      .order('time_slot');
    
    const { data: providerAvail } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('date', today)
      .order('time_slot');
    
    console.log('🚿 SHOWER AVAILABILITY TODAY:', showerAvail);
    console.log('👨‍⚕️ PROVIDER AVAILABILITY TODAY:', providerAvail);
    
    // Check provider profiles
    const { data: providers } = await supabase.from('provider_profiles').select('*');
    console.log('👥 PROVIDER PROFILES:', providers);
    
  } catch (error) {
    console.error('❌ AUDIT ERROR:', error);
  }
}
