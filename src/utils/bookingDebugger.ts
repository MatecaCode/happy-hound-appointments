
import { supabase } from '@/integrations/supabase/client';

export interface BookingDebugData {
  serviceData: any;
  staffProfiles: any[];
  staffAvailability: any[];
  existingAppointments: any[];
  slotValidation: {
    slot: string;
    staffAvailable: boolean;
    conflicts: any[];
  }[];
}

export async function debugBookingState(
  serviceId: string,
  staffProfileId: string | null,
  date: string,
  timeSlot: string
): Promise<BookingDebugData> {
  console.log('🔍 [BOOKING_DEBUGGER] Starting comprehensive debug analysis:', {
    serviceId,
    staffProfileId,
    date,
    timeSlot
  });

  // Get service data
  const { data: serviceData } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single();

  // Get relevant staff profiles
  let staffProfiles: any[] = [];
  if (staffProfileId) {
    const { data } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', staffProfileId);
    staffProfiles = data || [];
  }

  // Get staff availability
  const { data: staffAvailability } = await supabase
    .from('staff_availability')
    .select('*')
    .eq('staff_profile_id', staffProfileId)
    .eq('date', date)
    .order('time_slot');

  // Get existing appointments for this staff/date
  const { data: existingAppointments } = await supabase
    .from('appointment_staff')
    .select(`
      appointment_id,
      appointments!inner(
        id,
        date,
        time,
        status,
        services(name, default_duration)
      )
    `)
    .eq('staff_profile_id', staffProfileId)
    .eq('appointments.date', date)
    .not('appointments.status', 'in', '(cancelled,rejected)');

  // Validate each slot in the service duration
  const slotValidation = [];
  const duration = serviceData?.default_duration || 30;
  const startTime = new Date(`2000-01-01T${timeSlot}:00`);
  
  for (let i = 0; i < duration; i += 30) {
    const checkTime = new Date(startTime.getTime() + (i * 60 * 1000));
    const checkTimeStr = checkTime.toTimeString().substring(0, 8);
    
    // Check staff availability
    const staffAvailable = staffProfileId ? 
      staffAvailability?.some(sa => 
        sa.time_slot === checkTimeStr && sa.available
      ) : true;

    // Check conflicts
    const conflicts = existingAppointments?.filter((item: any) => {
      const apt = item.appointments;
      const aptStart = new Date(`2000-01-01T${apt.time}`);
      const aptEnd = new Date(aptStart.getTime() + ((apt.services?.default_duration || 30) * 60 * 1000));
      const checkEnd = new Date(checkTime.getTime() + (30 * 60 * 1000));
      
      return (checkTime < aptEnd && checkEnd > aptStart);
    }) || [];

    slotValidation.push({
      slot: checkTimeStr,
      staffAvailable,
      conflicts
    });
  }

  const debugData: BookingDebugData = {
    serviceData,
    staffProfiles,
    staffAvailability: staffAvailability || [],
    existingAppointments: existingAppointments || [],
    slotValidation
  };

  console.log('📊 [BOOKING_DEBUGGER] Complete debug data:', debugData);
  return debugData;
}

export async function compareSlotFetchVsBooking(
  serviceId: string,
  staffProfileId: string | null,
  date: string,
  timeSlot: string
) {
  console.log('🔄 [SLOT_COMPARISON] Comparing slot fetch vs booking logic');

  // 1. Fetch available slots using a simple query since the RPC doesn't exist
  let availableSlots: any[] = [];
  try {
    // Get staff availability for the date
    if (staffProfileId) {
      const { data } = await supabase
        .from('staff_availability')
        .select('time_slot')
        .eq('staff_profile_id', staffProfileId)
        .eq('date', date)
        .eq('available', true)
        .order('time_slot');
      
      availableSlots = data || [];
    }
  } catch (error) {
    console.error('Error fetching available slots:', error);
  }

  console.log('📋 [SLOT_COMPARISON] Available slots from query:', {
    slots: availableSlots,
    requestedSlot: timeSlot + ':00',
    isSlotAvailable: availableSlots?.some(slot => slot.time_slot === timeSlot + ':00')
  });

  // 2. Get comprehensive debug data
  const debugData = await debugBookingState(serviceId, staffProfileId, date, timeSlot);

  // 3. Analyze discrepancies
  const analysis = {
    slotShownAsAvailable: availableSlots?.some(slot => slot.time_slot === timeSlot + ':00'),
    allSlotsValid: debugData.slotValidation.every(sv => 
      sv.staffAvailable && sv.conflicts.length === 0
    ),
    failureReasons: debugData.slotValidation
      .filter(sv => !sv.staffAvailable || sv.conflicts.length > 0)
      .map(sv => ({
        slot: sv.slot,
        staffIssue: !sv.staffAvailable,
        conflictIssue: sv.conflicts.length > 0,
        conflicts: sv.conflicts
      }))
  };

  console.log('🎯 [SLOT_COMPARISON] Analysis:', analysis);
  return { availableSlots, debugData, analysis };
}
