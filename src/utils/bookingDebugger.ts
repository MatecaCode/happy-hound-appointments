
import { supabase } from '@/integrations/supabase/client';

export interface BookingDebugData {
  serviceData: any;
  serviceResources: any[];
  providerData: any;
  providerAvailability: any[];
  showerAvailability: any[];
  existingAppointments: any[];
  slotValidation: {
    slot: string;
    providerAvailable: boolean;
    showerAvailable: boolean;
    conflicts: any[];
  }[];
}

export async function debugBookingState(
  serviceId: string,
  providerId: string | null,
  date: string,
  timeSlot: string
): Promise<BookingDebugData> {
  console.log('🔍 [BOOKING_DEBUGGER] Starting comprehensive debug analysis:', {
    serviceId,
    providerId,
    date,
    timeSlot
  });

  // Get service data
  const { data: serviceData } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single();

  // Get service resources
  const { data: serviceResources } = await supabase
    .from('service_resources')
    .select('*')
    .eq('service_id', serviceId);

  // Get provider data if provided
  let providerData = null;
  if (providerId) {
    const { data } = await supabase
      .from('provider_profiles')
      .select('*')
      .eq('id', providerId)
      .single();
    providerData = data;
  }

  // Get provider availability
  const { data: providerAvailability } = await supabase
    .from('provider_availability')
    .select('*')
    .eq('provider_id', providerId)
    .eq('date', date)
    .order('time_slot');

  // Get shower availability
  const { data: showerAvailability } = await supabase
    .from('shower_availability')
    .select('*')
    .eq('date', date)
    .order('time_slot');

  // Get existing appointments for this provider/date
  const { data: existingAppointments } = await supabase
    .from('appointments')
    .select(`
      *,
      appointment_providers!inner(*),
      services(*)
    `)
    .eq('date', date)
    .eq('appointment_providers.provider_id', providerId)
    .not('status', 'in', '(cancelled,rejected)');

  // Validate each slot in the service duration
  const slotValidation = [];
  const duration = serviceData?.duration_minutes || 30;
  const startTime = new Date(`2000-01-01T${timeSlot}:00`);
  
  for (let i = 0; i < duration; i += 30) {
    const checkTime = new Date(startTime.getTime() + (i * 60 * 1000));
    const checkTimeStr = checkTime.toTimeString().substring(0, 5) + ':00';
    
    // Check provider availability
    const providerAvailable = providerId ? 
      providerAvailability?.some(pa => 
        pa.time_slot === checkTimeStr && pa.available
      ) : true;

    // Check shower availability
    const showerAvailable = showerAvailability?.some(sa => 
      sa.time_slot === checkTimeStr && sa.available_spots > 0
    );

    // Check conflicts
    const conflicts = existingAppointments?.filter(apt => {
      const aptStart = new Date(`2000-01-01T${apt.time}`);
      const aptEnd = new Date(aptStart.getTime() + ((apt.services?.duration_minutes || 30) * 60 * 1000));
      const checkEnd = new Date(checkTime.getTime() + (30 * 60 * 1000));
      
      return (checkTime < aptEnd && checkEnd > aptStart);
    }) || [];

    slotValidation.push({
      slot: checkTimeStr,
      providerAvailable,
      showerAvailable,
      conflicts
    });
  }

  const debugData: BookingDebugData = {
    serviceData,
    serviceResources: serviceResources || [],
    providerData,
    providerAvailability: providerAvailability || [],
    showerAvailability: showerAvailability || [],
    existingAppointments: existingAppointments || [],
    slotValidation
  };

  console.log('📊 [BOOKING_DEBUGGER] Complete debug data:', debugData);
  return debugData;
}

export async function compareSlotFetchVsBooking(
  serviceId: string,
  providerId: string | null,
  date: string,
  timeSlot: string
) {
  console.log('🔄 [SLOT_COMPARISON] Comparing slot fetch vs booking logic');

  // 1. Fetch available slots using RPC
  const { data: availableSlots, error: slotsError } = await supabase.rpc('get_available_slots_for_service', {
    _service_id: serviceId,
    _date: date,
    _provider_id: providerId
  });

  console.log('📋 [SLOT_COMPARISON] Available slots from RPC:', {
    slots: availableSlots,
    error: slotsError,
    requestedSlot: timeSlot + ':00',
    isSlotAvailable: availableSlots?.some(slot => slot.time_slot === timeSlot + ':00')
  });

  // 2. Get comprehensive debug data
  const debugData = await debugBookingState(serviceId, providerId, date, timeSlot);

  // 3. Analyze discrepancies
  const analysis = {
    slotShownAsAvailable: availableSlots?.some(slot => slot.time_slot === timeSlot + ':00'),
    allSlotsValid: debugData.slotValidation.every(sv => 
      sv.providerAvailable && sv.showerAvailable && sv.conflicts.length === 0
    ),
    failureReasons: debugData.slotValidation
      .filter(sv => !sv.providerAvailable || !sv.showerAvailable || sv.conflicts.length > 0)
      .map(sv => ({
        slot: sv.slot,
        providerIssue: !sv.providerAvailable,
        showerIssue: !sv.showerAvailable,
        conflictIssue: sv.conflicts.length > 0,
        conflicts: sv.conflicts
      }))
  };

  console.log('🎯 [SLOT_COMPARISON] Analysis:', analysis);
  return { availableSlots, debugData, analysis };
}
