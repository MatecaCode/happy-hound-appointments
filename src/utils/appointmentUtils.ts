
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ✅ CLEAN BOOKING: Updated for Phase 1 schema with client_id and staff_profiles
export async function createAppointment(
  userId: string,
  petId: string,
  serviceId: string,
  staffProfileId: string | null, // Now uses staff_profile_id directly
  date: Date,
  timeSlot: string,
  notes?: string,
  isAdminOverride: boolean = false
): Promise<{ success: boolean; appointmentId?: string; bookingData?: any; error?: any }> {
  try {
    console.log('🚀 [CREATE_APPOINTMENT] Starting booking with Phase 1 schema:', {
      userId,
      petId,
      serviceId,
      staffProfileId, // This is now staff_profile_id
      date: date.toISOString(),
      timeSlot,
      notes,
      isAdminOverride,
      timestamp: new Date().toISOString()
    });

    const isoDate = date.toISOString().split('T')[0];
    
    // Get user, pet, service data for notifications
    const { data: userData } = await supabase.auth.getUser();
    const { data: petData } = await supabase
      .from('pets')
      .select('name')
      .eq('id', petId)
      .single();
    
    const { data: serviceData } = await supabase
      .from('services')
      .select('name, default_duration')
      .eq('id', serviceId)
      .single();

    console.log('📊 [CREATE_APPOINTMENT] Basic data retrieved:', {
      user: userData?.user?.user_metadata?.name,
      pet: petData?.name,
      service: serviceData?.name,
      duration: serviceData?.default_duration
    });

    let staffData = null;
    
    // Get staff data if staff is selected
    if (staffProfileId) {
      console.log('👥 [CREATE_APPOINTMENT] Fetching staff data for:', staffProfileId);

      const { data: staffProfile } = await supabase
        .from('staff_profiles')
        .select('user_id, name, can_bathe, can_groom, can_vet')
        .eq('id', staffProfileId)
        .single();
      
      console.log('📊 [CREATE_APPOINTMENT] Staff profile data:', staffProfile);

      if (staffProfile) {
        staffData = {
          id: staffProfileId,
          user_id: staffProfile.user_id,
          name: staffProfile.name || 'Staff Member'
        };

        console.log('✅ [CREATE_APPOINTMENT] Staff data assembled:', staffData);
      }
    }

    // 🔧 FIXED: Ensure time slot is in correct HH:MM:SS format
    let formattedTimeSlot = timeSlot;
    
    if (timeSlot.split(':').length === 2) {
      formattedTimeSlot = timeSlot + ':00';
    } else if (timeSlot.split(':').length === 3) {
      formattedTimeSlot = timeSlot;
    }

    console.log('🕐 [CREATE_APPOINTMENT] Time slot formatting:', {
      original_time_slot: timeSlot,
      formatted_time_slot: formattedTimeSlot,
      segments_original: timeSlot.split(':').length,
      segments_formatted: formattedTimeSlot.split(':').length
    });

    // ✅ UPDATED: Direct booking call with new Phase 1 RPC
    const bookingParams = {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _staff_profile_ids: staffProfileId ? [staffProfileId] : [],
      _booking_date: isoDate,
      _time_slot: formattedTimeSlot,
      _notes: notes || null
    };

    console.log('📤 [CREATE_APPOINTMENT] 🔥 CALLING create_booking_atomic RPC:', bookingParams);
    
    const { data: appointmentId, error } = await supabase.rpc('create_booking_atomic', bookingParams);

    console.log('📨 [CREATE_APPOINTMENT] 🔥 RPC create_booking_atomic RESPONSE:', {
      appointmentId,
      error,
      success: !error && !!appointmentId,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ [CREATE_APPOINTMENT] RPC ERROR:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        full_error: error
      });
      
      // Enhanced error message handling
      let userErrorMessage = 'Erro no agendamento';
      
      if (error.message.includes('not available') || error.message.includes('Staff') && error.message.includes('not available')) {
        userErrorMessage = 'Profissional não disponível para o horário selecionado.';
      } else if (error.message.includes('not qualified')) {
        userErrorMessage = 'Profissional não qualificado para este serviço.';
      } else if (error.message.includes('permission denied') || error.message.includes('row-level security')) {
        userErrorMessage = 'Erro de permissão. Verifique se você está logado.';
      } else if (error.message.includes('violates')) {
        userErrorMessage = 'Erro de validação de dados.';
      } else if (error.message.includes('invalid input syntax for type time')) {
        userErrorMessage = 'Formato de horário inválido. Por favor, tente novamente.';
      } else {
        userErrorMessage = `Erro: ${error.message}`;
      }
      
      toast.error(userErrorMessage);
      
      return { 
        success: false, 
        error: {
          ...error,
          userMessage: userErrorMessage
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

    // 🆕 ADMIN OVERRIDE TRACKING: Track if this was an admin override
    if (isAdminOverride && userData?.user) {
      try {
        console.log('📝 [CREATE_APPOINTMENT] Recording admin override action');
        await trackAdminAction(
          userData.user.id,
          'create_appointment',
          'appointment',
          appointmentId,
          'Admin override booking',
          null, // no old values for creation
          {
            appointment_id: appointmentId,
            created_by_admin: true,
            override_reason: 'Manual admin booking'
          },
          'Appointment created by admin with potential availability override'
        );
      } catch (adminError) {
        console.error('⚠️ [CREATE_APPOINTMENT] Failed to track admin action:', adminError);
        // Don't fail the booking if admin tracking fails
      }
    }

    // Prepare booking data for success page
    const bookingData = {
      appointmentId,
      petName: petData?.name || 'Pet',
      serviceName: serviceData?.name || 'Serviço',
      date: isoDate,
      time: timeSlot,
      staffName: staffData?.name,
      notes,
      userName: userData?.user?.user_metadata?.name || 'Cliente',
      userEmail: userData?.user?.email
    };

    console.log('🎉 [CREATE_APPOINTMENT] BOOKING SUCCESS:', {
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
    console.error('💥 [CREATE_APPOINTMENT] CRITICAL ERROR:', {
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

// 🆕 NEW: Admin action tracking function
export async function trackAdminAction(
  adminUserId: string,
  actionType: string,
  targetType: string,
  targetId: string,
  reason: string,
  oldValues: any = null,
  newValues: any = null,
  notes: string = ''
): Promise<void> {
  try {
    const { error } = await supabase
      .from('admin_actions')
      .insert({
        admin_user_id: adminUserId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        reason: reason,
        old_values: oldValues,
        new_values: newValues,
        notes: notes
      });

    if (error) {
      throw error;
    }

    console.log('✅ Admin action tracked:', {
      adminUserId,
      actionType,
      targetType,
      targetId,
      reason
    });
  } catch (error) {
    console.error('❌ Failed to track admin action:', error);
    throw error;
  }
}

// Helper function to get service resource requirements (updated for Phase 1)
export async function getServiceResources(serviceId: string) {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('requires_bath, requires_grooming, requires_vet')
      .eq('id', serviceId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching service resources:', error);
    return null;
  }
}

// Helper function to check if service requires bath (updated for Phase 1)
export async function serviceRequiresBath(serviceId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('requires_bath')
      .eq('id', serviceId)
      .single();

    return !error && !!data?.requires_bath;
  } catch (error) {
    return false;
  }
}

// 🆕 NEW: Get available staff for service (Phase 1)
export async function getAvailableStaffForService(
  serviceId: string,
  date: Date,
  locationId?: string
) {
  try {
    const dateStr = date.toISOString().split('T')[0];
    
    const { data, error } = await supabase.rpc('get_available_staff_for_service', {
      _service_id: serviceId,
      _date: dateStr,
      _location_id: locationId || null
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching available staff:', error);
    return [];
  }
}

// Debug function to audit current system state (updated for Phase 1)
export async function auditBookingSystemState() {
  console.log('🔍 PHASE 1 SYSTEM STATE AUDIT:');
  
  try {
    // Check services and their requirements
    const { data: services } = await supabase.from('services').select('*');
    
    console.log('📋 SERVICES:', services);
    
    // Check staff profiles and availability
    const { data: staffProfiles } = await supabase.from('staff_profiles').select('*');
    console.log('👥 STAFF PROFILES:', staffProfiles);
    
    // Check availability data for today
    const today = new Date().toISOString().split('T')[0];
    const { data: staffAvail } = await supabase
      .from('staff_availability')
      .select('*')
      .eq('date', today)
      .order('time_slot');
    
    console.log('🗓️ STAFF AVAILABILITY TODAY:', staffAvail);
    
  } catch (error) {
    console.error('❌ AUDIT ERROR:', error);
  }
}
