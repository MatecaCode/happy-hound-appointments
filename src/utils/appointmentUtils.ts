
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ✅ PHASE 1 CLEAN BOOKING: Updated to use only staff_profiles and appointment_staff
export async function createAppointment(
  userId: string,
  petId: string,
  serviceId: string,
  staffProfileId: string | null,
  date: Date,
  timeSlot: string,
  notes?: string,
  isAdminOverride: boolean = false
): Promise<{ success: boolean; appointmentId?: string; bookingData?: any; error?: any }> {
  try {
    console.log('🚀 [CREATE_APPOINTMENT] Starting Phase 1 booking:', {
      userId,
      petId,
      serviceId,
      staffProfileId,
      date: date.toISOString(),
      timeSlot,
      notes,
      isAdminOverride
    });

    const isoDate = date.toISOString().split('T')[0];
    
    // Get client_id from user_id
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (clientError || !clientData) {
      console.error('❌ [CREATE_APPOINTMENT] No client found for user:', userId);
      toast.error('Erro: dados do cliente não encontrados');
      return { success: false, error: 'Client not found' };
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

    // Format time slot correctly
    let formattedTimeSlot = timeSlot;
    if (timeSlot.split(':').length === 2) {
      formattedTimeSlot = timeSlot + ':00';
    }

    console.log('🕐 [CREATE_APPOINTMENT] Time slot formatting:', {
      original_time_slot: timeSlot,
      formatted_time_slot: formattedTimeSlot
    });

    // Create appointment using direct insert (Phase 1 approach)
    const appointmentData = {
      client_id: clientData.id,
      pet_id: petId,
      service_id: serviceId,
      date: isoDate,
      time: formattedTimeSlot,
      notes: notes || null,
      status: 'pending',
      service_status: 'not_started',
      duration: serviceData?.default_duration || 60,
      total_price: 0, // Will be calculated by pricing service
      is_admin_override: isAdminOverride
    };

    console.log('📤 [CREATE_APPOINTMENT] Creating appointment with data:', appointmentData);
    
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) {
      console.error('❌ [CREATE_APPOINTMENT] Database error:', error);
      toast.error('Erro ao criar agendamento: ' + error.message);
      return { success: false, error };
    }

    if (!appointment) {
      console.error('❌ [CREATE_APPOINTMENT] No appointment returned');
      toast.error('Erro interno: ID do agendamento não foi retornado');
      return { success: false, error: 'No appointment ID returned' };
    }

    console.log('✅ [CREATE_APPOINTMENT] Appointment created:', appointment);

    // Link staff if provided
    if (staffProfileId && appointment) {
      console.log('🔗 [CREATE_APPOINTMENT] Linking staff member via appointment_staff');
      
      const { error: staffError } = await supabase
        .from('appointment_staff')
        .insert({
          appointment_id: appointment.id,
          staff_profile_id: staffProfileId,
          role: 'primary'
        });

      if (staffError) {
        console.error('❌ [CREATE_APPOINTMENT] Failed to link staff:', staffError);
        // Don't fail the whole appointment for this
      } else {
        console.log('✅ [CREATE_APPOINTMENT] Staff successfully linked');
      }
    }

    // Track admin action if admin override
    if (isAdminOverride && userData?.user) {
      try {
        await trackAdminAction(
          userData.user.id,
          'create_appointment',
          'appointment',
          appointment.id,
          'Admin override booking',
          null,
          {
            appointment_id: appointment.id,
            created_by_admin: true,
            override_reason: 'Manual admin booking'
          },
          'Appointment created by admin with potential availability override'
        );
      } catch (adminError) {
        console.error('⚠️ [CREATE_APPOINTMENT] Failed to track admin action:', adminError);
      }
    }

    // Prepare booking data for success page
    const bookingData = {
      appointmentId: appointment.id,
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
      appointmentId: appointment.id,
      bookingData
    });
    
    toast.success('Agendamento criado com sucesso!');
    
    return { 
      success: true, 
      appointmentId: appointment.id, 
      bookingData 
    };

  } catch (error: any) {
    console.error('💥 [CREATE_APPOINTMENT] CRITICAL ERROR:', error);
    toast.error('Erro crítico no sistema de agendamento');
    return { 
      success: false, 
      error: {
        message: error?.message || 'Unknown error',
        fullError: error
      }
    };
  }
}

// Admin action tracking function
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

// Helper function to get service resource requirements (Phase 1)
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

// Helper function to check if service requires bath (Phase 1)
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

// Get available staff for service (Phase 1)
export async function getAvailableStaffForService(
  serviceId: string,
  date: Date,
  locationId?: string
) {
  try {
    const dateStr = date.toISOString().split('T')[0];
    
    // Get service requirements
    const { data: service } = await supabase
      .from('services')
      .select('requires_grooming, requires_vet, requires_bath')
      .eq('id', serviceId)
      .single();

    if (!service) return [];

    // Build query for staff_profiles
    let query = supabase
      .from('staff_profiles')
      .select('*')
      .eq('active', true);

    // Filter by capabilities based on service requirements
    if (service.requires_grooming) {
      query = query.eq('can_groom', true);
    }
    if (service.requires_vet) {
      query = query.eq('can_vet', true);
    }
    if (service.requires_bath) {
      query = query.eq('can_bathe', true);
    }

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching available staff:', error);
    return [];
  }
}

// Debug function to audit current system state (Phase 1)
export async function auditBookingSystemState() {
  console.log('🔍 PHASE 1 SYSTEM STATE AUDIT:');
  
  try {
    // Check services and their requirements
    const { data: services } = await supabase.from('services').select('*');
    console.log('📋 SERVICES:', services);
    
    // Check staff profiles and capabilities
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
    
    // Check appointment_staff linkages
    const { data: appointmentStaff } = await supabase
      .from('appointment_staff')
      .select('*')
      .limit(10);
    
    console.log('🔗 APPOINTMENT_STAFF LINKAGES (last 10):', appointmentStaff);
    
  } catch (error) {
    console.error('❌ AUDIT ERROR:', error);
  }
}
