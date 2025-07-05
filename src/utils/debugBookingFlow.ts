
import { supabase } from '@/integrations/supabase/client';

// Debug function to check staff availability for specific parameters
export async function debugStaffAvailability(
  staffProfileId: string,
  date: string,
  timeSlot: string
) {
  try {
    console.log('🔍 [DEBUG] Checking staff availability with exact parameters:', {
      staff_profile_id: staffProfileId,
      date: date,
      time_slot: timeSlot + ':00'
    });

    const { data, error } = await supabase
      .from('staff_availability')
      .select('*')
      .eq('staff_profile_id', staffProfileId)
      .eq('date', date)
      .eq('time_slot', timeSlot + ':00');

    console.log('📊 [DEBUG] Staff availability query result:', { data, error });
    
    if (data && data.length > 0) {
      console.log('✅ [DEBUG] Found availability records:', data);
    } else {
      console.log('❌ [DEBUG] No availability records found for these exact parameters');
      
      // Also check what records DO exist for this staff/date
      const { data: allRecords } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('staff_profile_id', staffProfileId)
        .eq('date', date);
      
      console.log('📋 [DEBUG] All availability records for this staff/date:', allRecords);
    }

    return { data, error };
  } catch (error) {
    console.error('💥 [DEBUG] Critical error in availability check:', error);
  }
}

// Debug function to show all staff profiles and their mapping
export async function debugStaffProfileMapping() {
  try {
    console.log('🔍 [DEBUG] Fetching staff profile mapping...');
    
    const { data: staffProfiles, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, user_id, name, can_groom, can_vet, can_bathe');

    if (staffError) {
      console.error('❌ [DEBUG] Error fetching staff profiles:', staffError);
      return;
    }

    const mapping = staffProfiles?.map(staff => ({
      staff_name: staff.name,
      staff_user_id: staff.user_id,
      staff_profile_id: staff.id,
      can_groom: staff.can_groom,
      can_vet: staff.can_vet,
      can_bathe: staff.can_bathe
    }));

    console.log('📊 [DEBUG] Complete staff profile mapping:', mapping);
    return mapping;
  } catch (error) {
    console.error('💥 [DEBUG] Critical error in mapping check:', error);
  }
}
