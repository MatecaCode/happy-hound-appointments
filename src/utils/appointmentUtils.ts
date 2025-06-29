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
): Promise<{ success: boolean; appointmentId?: string; bookingData?: any; error?: any }> {
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
    
    // 🔥 CRITICAL: Get the latest fetched slots for validation
    const lastFetchedSlots = (window as any).lastFetchedSlots;
    const lastFetchParams = (window as any).lastFetchParams;
    
    console.log('📤 [CREATE_APPOINTMENT] 🔥 CRITICAL VALIDATION - Last fetched slots:', {
      lastFetchedSlots,
      lastFetchParams,
      current_slot: timeSlot + ':00',
      slot_exists_in_fetched: Array.isArray(lastFetchedSlots) ? 
        lastFetchedSlots.some(slot => slot.time_slot === timeSlot + ':00') : false,
      timestamp: new Date().toISOString()
    });

    // 🔒 CRITICAL: Block booking if no fetched slots or slot not in list
    if (!Array.isArray(lastFetchedSlots)) {
      console.error('❌ [CREATE_APPOINTMENT] CRITICAL: No fetched slots available for validation');
      toast.error('Erro: dados de horários não disponíveis. Recarregue a página.');
      return { success: false, error: 'No fetched slots available for validation' };
    }

    const slotExistsInFetched = lastFetchedSlots.some(slot => slot.time_slot === timeSlot + ':00');
    if (!slotExistsInFetched) {
      console.error('❌ [CREATE_APPOINTMENT] CRITICAL: Selected slot not in fetched slots:', {
        selected_slot: timeSlot + ':00',
        available_slots: lastFetchedSlots.map(s => s.time_slot),
        timestamp: new Date().toISOString()
      });
      toast.error('Horário selecionado não está mais disponível');
      return { success: false, error: 'Selected slot not in fetched slots' };
    }

    // 🔥 ENHANCED LOGGING: Log exact parameters for create_booking_atomic
    const bookingParams = {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _provider_ids: providerProfileId ? [providerProfileId] : [],
      _booking_date: isoDate,
      _time_slot: timeSlot + ':00', // Ensure proper time format
      _notes: notes || null
    };

    console.log('📤 [CREATE_APPOINTMENT] 🔥 CALLING create_booking_atomic RPC with EXACT params:', {
      ...bookingParams,
      timestamp: new Date().toISOString()
    });

    // 🔍 COMPREHENSIVE DEBUG ANALYSIS
    console.log('🔍 [CREATE_APPOINTMENT] Running comprehensive debug analysis...');
    const debugResult = await compareSlotFetchVsBooking(
      serviceId,
      providerProfileId,
      isoDate,
      timeSlot
    );
    
    console.log('📊 [CREATE_APPOINTMENT] 🔥 DEBUG ANALYSIS RESULTS:', {
      slot_shown_as_available: debugResult.analysis.slotShownAsAvailable,
      all_slots_valid: debugResult.analysis.allSlotsValid,
      failure_reasons: debugResult.analysis.failureReasons,
      available_slots_from_debug: debugResult.availableSlots,
      full_debug_result: debugResult,
      timestamp: new Date().toISOString()
    });
    
    if (!debugResult.analysis.slotShownAsAvailable) {
      console.error('❌ [CREATE_APPOINTMENT] CRITICAL: Slot not shown as available in RPC but booking attempted');
      console.error('❌ [CREATE_APPOINTMENT] DETAILED COMPARISON:', {
        requested_slot: timeSlot,
        available_slots_from_rpc: debugResult.availableSlots,
        booking_params: bookingParams,
        debug_analysis: debugResult.analysis
      });
      toast.error('Erro interno: horário não validado pelo sistema');
      return { success: false, error: 'Slot not shown as available in RPC validation' };
    }
    
    if (!debugResult.analysis.allSlotsValid) {
      console.error('❌ [CREATE_APPOINTMENT] CRITICAL: Slot validation failed:', debugResult.analysis.failureReasons);
      toast.error('Horário não disponível devido a conflitos detectados');
      return { success: false, error: 'Slot validation failed: ' + debugResult.analysis.failureReasons.join(', ') };
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

    console.log('📞 [CREATE_APPOINTMENT] 🔥 ABOUT TO CALL create_booking_atomic RPC with final params:', {
      ...bookingParams,
      provider_data: providerData,
      timestamp: new Date().toISOString()
    });
    
    const { data: appointmentId, error } = await supabase.rpc('create_booking_atomic', bookingParams);

    console.log('📨 [CREATE_APPOINTMENT] 🔥 RPC create_booking_atomic RESPONSE:', {
      appointmentId,
      error,
      error_message: error?.message,
      error_details: error?.details,
      error_hint: error?.hint,
      error_code: error?.code,
      success: !error && !!appointmentId,
      request_params: bookingParams,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ [CREATE_APPOINTMENT] RPC ERROR: Booking failed:', {
        error_message: error.message,
        error_details: error.details,
        error_hint: error.hint,
        error_code: error.code,
        full_error: error,
        request_params: bookingParams
      });
      
      // Enhanced error message handling
      let userErrorMessage = 'Erro no agendamento';
      
      if (error.message.includes('not available') || error.message.includes('Provider') && error.message.includes('not available')) {
        userErrorMessage = 'Profissional não disponível para o horário selecionado.';
      } else if (error.message.includes('capacity exceeded') || error.message.includes('Shower capacity exceeded')) {
        userErrorMessage = 'Capacidade de banho excedida para este horário.';
      } else if (error.message.includes('conflicting appointment')) {
        userErrorMessage = 'Profissional já tem compromisso neste horário.';
      } else if (error.message.includes('Vagas de banho esgotadas')) {
        userErrorMessage = 'Vagas de banho esgotadas para este horário.';
      } else if (error.message.includes('permission denied') || error.message.includes('row-level security')) {
        userErrorMessage = 'Erro de permissão. Verifique se você está logado.';
      } else if (error.message.includes('violates')) {
        userErrorMessage = 'Erro de validação de dados.';
      } else {
        userErrorMessage = `Erro: ${error.message}`;
      }
      
      toast.error(userErrorMessage);
      
      return { 
        success: false, 
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }
      };
    }

    if (!appointmentId) {
      console.error('❌ [CREATE_APPOINTMENT] NO APPOINTMENT ID: RPC succeeded but returned no ID');
      toast.error('Erro interno: ID do agendamento não foi retornado');
      return { 
        success: false, 
        error: 'No appointment ID returned from RPC'
      };
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
      bookingData,
      timestamp: new Date().toISOString()
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
      full_error: error,
      timestamp: new Date().toISOString()
    });
    toast.error('Erro crítico no sistema de agendamento');
    return { 
      success: false, 
      error: {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        fullError: error
      }
    };
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
