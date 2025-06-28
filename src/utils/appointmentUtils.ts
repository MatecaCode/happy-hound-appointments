import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { debugBookingState, compareSlotFetchVsBooking } from './bookingDebugger';

// ENHANCED LOGGING: Accept provider_profile_id directly with comprehensive tracking
export async function createAppointment(
  userId: string,
  petId: string,
  serviceId: string,
  providerProfileId: string | null, // This is now provider_profile_id directly
  date: Date,
  timeSlot: string,
  notes?: string
): Promise<{ success: boolean; appointmentId?: string; bookingData?: any }> {
  try {
    console.log('🚀 [CREATE_APPOINTMENT] Starting appointment creation with enhanced logging:', {
      userId,
      petId,
      serviceId,
      providerProfileId, // This is provider_profile_id
      date: date.toISOString(),
      timeSlot,
      notes,
      timestamp: new Date().toISOString()
    });

    const isoDate = date.toISOString().split('T')[0];
    
    // 🔍 COMPREHENSIVE DEBUG ANALYSIS
    console.log('🔍 [CREATE_APPOINTMENT] Running comprehensive debug analysis...');
    const debugResult = await compareSlotFetchVsBooking(
      serviceId,
      providerProfileId,
      isoDate,
      timeSlot
    );
    
    if (!debugResult.analysis.slotShownAsAvailable) {
      console.error('❌ [CREATE_APPOINTMENT] CRITICAL: Slot not shown as available in RPC but booking attempted');
      toast.error('Erro interno: horário não validado pelo sistema');
      return { success: false };
    }
    
    if (!debugResult.analysis.allSlotsValid) {
      console.error('❌ [CREATE_APPOINTMENT] CRITICAL: Slot validation failed:', debugResult.analysis.failureReasons);
      toast.error('Horário não disponível devido a conflitos detectados');
      return { success: false };
    }

    // Get user, pet, service data for notifications
    const { data: userData } = await supabase.auth.getUser();
    const { data: petData } = await supabase
      .from('pets')
      .select('name')
      .eq('id', petId)
      .single();
    
    const { data: serviceData } = await supabase
      .from('services')
      .select('name, duration_minutes')
      .eq('id', serviceId)
      .single();

    console.log('📊 [CREATE_APPOINTMENT] Basic data retrieved:', {
      user: userData?.user?.user_metadata?.name,
      pet: petData?.name,
      service: serviceData?.name,
      duration: serviceData?.duration_minutes
    });

    let providerData = null;
    
    // Get provider data if provider is selected
    if (providerProfileId) {
      console.log('👥 [CREATE_APPOINTMENT] Fetching provider data for:', providerProfileId);

      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('user_id, type')
        .eq('id', providerProfileId)
        .single();
      
      console.log('📊 [CREATE_APPOINTMENT] Provider profile data:', providerProfile);

      if (providerProfile) {
        // Get user name for the provider
        const { data: providerUserData } = await supabase
          .from('clients')
          .select('name')
          .eq('user_id', providerProfile.user_id)
          .single();
        
        const { data: groomerData } = await supabase
          .from('groomers')
          .select('name')
          .eq('user_id', providerProfile.user_id)
          .single();
        
        const { data: vetData } = await supabase
          .from('veterinarians')
          .select('name')
          .eq('user_id', providerProfile.user_id)
          .single();
        
        providerData = {
          id: providerProfileId,
          user_id: providerProfile.user_id,
          name: providerUserData?.name || groomerData?.name || vetData?.name || 'Provider'
        };

        console.log('✅ [CREATE_APPOINTMENT] Provider data assembled:', providerData);
      }
    }

    // Call the atomic booking RPC with correct provider_profile_id
    console.log('🔄 [CREATE_APPOINTMENT] CALLING RPC: create_booking_atomic with parameters:', {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _provider_ids: providerProfileId ? [providerProfileId] : [],
      _booking_date: isoDate,
      _time_slot: timeSlot + ':00', // Ensure proper time format
      _notes: notes || null
    });
    
    const providerIds = providerProfileId ? [providerProfileId] : [];
    
    const { data: appointmentId, error } = await supabase.rpc('create_booking_atomic', {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _provider_ids: providerIds, // Using provider_profile_id directly
      _booking_date: isoDate,
      _time_slot: timeSlot + ':00', // Ensure proper time format
      _notes: notes || null
    });

    console.log('📞 [CREATE_APPOINTMENT] RPC create_booking_atomic result:', {
      appointmentId,
      error,
      success: !error && !!appointmentId
    });

    if (error) {
      console.error('❌ [CREATE_APPOINTMENT] RPC ERROR: Booking failed:', {
        error_message: error.message,
        error_details: error.details,
        error_hint: error.hint,
        error_code: error.code,
        full_error: error
      });
      
      if (error.message.includes('not available') || error.message.includes('Provider') && error.message.includes('not available')) {
        toast.error('Profissional não disponível para o horário selecionado.');
      } else if (error.message.includes('capacity exceeded') || error.message.includes('Shower capacity exceeded')) {
        toast.error('Capacidade de banho excedida para este horário.');
      } else if (error.message.includes('conflicting appointment')) {
        toast.error('Profissional já tem compromisso neste horário.');
      } else if (error.message.includes('Vagas de banho esgotadas')) {
        toast.error('Vagas de banho esgotadas para este horário.');
      } else {
        toast.error(`Erro: ${error.message}`);
      }
      
      return { success: false };
    }

    if (!appointmentId) {
      console.error('❌ [CREATE_APPOINTMENT] NO APPOINTMENT ID: RPC succeeded but returned no ID');
      toast.error('Erro interno: ID do agendamento não foi retornado');
      return { success: false };
    }

    // Prepare booking data for success page
    const bookingData = {
      appointmentId,
      petName: petData?.name || 'Pet',
      serviceName: serviceData?.name || 'Serviço',
      date: isoDate,
      time: timeSlot,
      providerName: providerData?.name,
      notes,
      userName: userData?.user?.user_metadata?.name || 'Cliente',
      userEmail: userData?.user?.email
    };

    console.log('🎉 [CREATE_APPOINTMENT] BOOKING SUCCESS: Complete appointment record created:', {
      appointmentId,
      bookingData
    });
    toast.success('Agendamento enviado com sucesso!');
    
    return { 
      success: true, 
      appointmentId, 
      bookingData 
    };

  } catch (error: any) {
    console.error('💥 [CREATE_APPOINTMENT] CRITICAL ERROR: Unexpected error in createAppointment:', {
      error_message: error?.message,
      error_stack: error?.stack,
      full_error: error
    });
    toast.error('Erro crítico no sistema de agendamento');
    return { success: false };
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
