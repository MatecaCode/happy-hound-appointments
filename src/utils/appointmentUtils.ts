import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Main appointment creation function using the new atomic booking system
export async function createAppointment(
  userId: string,
  petId: string,
  serviceId: string,
  providerId: string | null, // This is user_id from groomer selection
  date: Date,
  timeSlot: string,
  notes?: string
): Promise<{ success: boolean; appointmentId?: string; bookingData?: any }> {
  try {
    console.log('🚀 BOOKING AUDIT: Starting appointment creation with params:', {
      userId,
      petId,
      serviceId,
      providerId, // This is user_id
      date: date.toISOString(),
      timeSlot,
      notes,
      timestamp: new Date().toISOString()
    });

    const isoDate = date.toISOString().split('T')[0];
    
    // STEP 1: Get user, pet, service, and provider data for notifications
    const { data: userData } = await supabase.auth.getUser();
    const { data: petData } = await supabase
      .from('pets')
      .select('name')
      .eq('id', petId)
      .single();
    
    const { data: serviceData } = await supabase
      .from('services')
      .select('name')
      .eq('id', serviceId)
      .single();

    let providerData = null;
    let providerProfileId = null;
    
    // CRITICAL FIX: Convert user_id to provider_profile_id if provider is selected
    if (providerId) {
      console.log('🔍 CONVERTING USER_ID TO PROVIDER_PROFILE_ID:', providerId);
      
      // Get the provider profile ID from the provider_profiles table using user_id
      const { data: providerProfile, error: profileError } = await supabase
        .from('provider_profiles')
        .select('id, user_id')
        .eq('user_id', providerId) // providerId is actually user_id from groomer selection
        .single();
      
      if (profileError || !providerProfile) {
        console.error('❌ PROVIDER PROFILE CONVERSION ERROR:', profileError);
        console.log('❌ Cannot find provider_profile for user_id:', providerId);
        toast.error('Erro: Perfil do profissional não encontrado');
        return { success: false };
      }

      providerProfileId = providerProfile.id;
      console.log('✅ PROVIDER CONVERSION SUCCESS:', { 
        user_id: providerId, 
        provider_profile_id: providerProfileId 
      });
      
      // Get user data for the provider
      const { data: providerUserData } = await supabase
        .from('clients')
        .select('name')
        .eq('user_id', providerId)
        .single();
      
      // Also try groomers table
      const { data: groomerData } = await supabase
        .from('groomers')
        .select('name')
        .eq('user_id', providerId)
        .single();
      
      providerData = {
        id: providerProfileId,
        user_id: providerId,
        name: providerUserData?.name || groomerData?.name || 'Provider'
      };
    }

    // STEP 2: Call the atomic booking RPC with correct provider profile IDs
    console.log('🔄 STEP 2: Calling create_booking_atomic RPC with provider_profile_id:', providerProfileId);
    
    const providerIds = providerProfileId ? [providerProfileId] : [];
    
    const { data: appointmentId, error } = await supabase.rpc('create_booking_atomic', {
      _user_id: userId,
      _pet_id: petId,
      _service_id: serviceId,
      _provider_ids: providerIds, // Now using correct provider_profile_id
      _booking_date: isoDate,
      _time_slot: timeSlot,
      _notes: notes || null
    });

    if (error) {
      console.error('❌ RPC ERROR: Booking failed:', error);
      
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
      console.error('❌ NO APPOINTMENT ID: RPC succeeded but returned no ID');
      toast.error('Erro interno: ID do agendamento não foi retornado');
      return { success: false };
    }

    // STEP 3: Trigger email notifications
    console.log('📧 STEP 3: Triggering email notifications...');
    
    const userEmail = userData?.user?.email;
    const userName = userData?.user?.user_metadata?.name || 'Cliente';
    const providerName = providerData?.name;
    const providerEmail = userData?.user?.email; // This needs to be fixed to get provider email

    // Prepare booking data for success page and emails
    const bookingData = {
      appointmentId,
      petName: petData?.name || 'Pet',
      serviceName: serviceData?.name || 'Serviço',
      date: isoDate,
      time: timeSlot,
      providerName,
      notes,
      userName,
      userEmail
    };

    // Call email notification function
    if (userEmail) {
      try {
        const response = await fetch('/functions/v1/send-booking-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            appointmentId,
            userEmail,
            userName,
            petName: petData?.name || 'Pet',
            serviceName: serviceData?.name || 'Serviço',
            date: isoDate,
            time: timeSlot,
            providerName,
            providerEmail,
            notes
          })
        });

        if (!response.ok) {
          console.warn('⚠️ Email notifications failed, but booking was successful');
        } else {
          console.log('✅ Email notifications sent successfully');
        }
      } catch (emailError) {
        console.warn('⚠️ Email error (booking still successful):', emailError);
      }
    }

    console.log('🎉 BOOKING SUCCESS: Complete appointment record created');
    toast.success('Agendamento enviado com sucesso!');
    
    return { 
      success: true, 
      appointmentId, 
      bookingData 
    };

  } catch (error: any) {
    console.error('💥 CRITICAL ERROR: Unexpected error in createAppointment:', error);
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
