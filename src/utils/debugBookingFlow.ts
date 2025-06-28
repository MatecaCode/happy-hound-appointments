
import { supabase } from '@/integrations/supabase/client';

// Debug function to check provider availability for specific parameters
export async function debugProviderAvailability(
  providerId: string,
  date: string,
  timeSlot: string
) {
  try {
    console.log('🔍 [DEBUG] Checking provider availability with exact parameters:', {
      provider_id: providerId,
      date: date,
      time_slot: timeSlot + ':00'
    });

    const { data, error } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', providerId)
      .eq('date', date)
      .eq('time_slot', timeSlot + ':00');

    console.log('📊 [DEBUG] Provider availability query result:', { data, error });
    
    if (data && data.length > 0) {
      console.log('✅ [DEBUG] Found availability records:', data);
    } else {
      console.log('❌ [DEBUG] No availability records found for these exact parameters');
      
      // Also check what records DO exist for this provider/date
      const { data: allRecords } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .eq('date', date);
      
      console.log('📋 [DEBUG] All availability records for this provider/date:', allRecords);
    }

    return { data, error };
  } catch (error) {
    console.error('💥 [DEBUG] Critical error in availability check:', error);
  }
}

// Debug function to show all groomers and their provider_profile_ids
export async function debugGroomerProviderMapping() {
  try {
    console.log('🔍 [DEBUG] Fetching groomer to provider_profile mapping...');
    
    const { data: groomers, error: groomerError } = await supabase
      .from('groomers')
      .select('user_id, name');

    const { data: providerProfiles, error: providerError } = await supabase
      .from('provider_profiles')
      .select('id, user_id, type');

    if (groomerError || providerError) {
      console.error('❌ [DEBUG] Error fetching mapping:', { groomerError, providerError });
      return;
    }

    const mapping = groomers?.map(groomer => {
      const profile = providerProfiles?.find(p => p.user_id === groomer.user_id && p.type === 'groomer');
      return {
        groomer_name: groomer.name,
        groomer_user_id: groomer.user_id,
        provider_profile_id: profile?.id || 'NOT FOUND',
        profile_type: profile?.type || 'NOT FOUND'
      };
    });

    console.log('📊 [DEBUG] Complete groomer to provider_profile mapping:', mapping);
    return mapping;
  } catch (error) {
    console.error('💥 [DEBUG] Critical error in mapping check:', error);
  }
}
