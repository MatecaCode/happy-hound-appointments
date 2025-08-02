// Admin-specific time slot utilities - isolated from client logic
// This mirrors the client logic but is completely separate for admin use

import { format } from 'date-fns';

export const ADMIN_TIME_SLOT_CONFIG = {
  CLIENT_INTERVAL_MINUTES: 30, // What admins see (30-min slots)
  BACKEND_INTERVAL_MINUTES: 10, // Backend granularity (10-min slots)
  START_HOUR: 9,
  END_HOUR_WEEKDAYS: 16, // Last slot at 16:00 for weekdays
  END_HOUR_SATURDAYS: 12, // Last slot at 12:00 for Saturdays
  TIMEZONE: 'America/Sao_Paulo'
} as const;

// Generate 30-minute admin-facing slots (default to weekdays)
export function generateAdminTimeSlots(isSaturday: boolean = false): string[] {
  const slots: string[] = [];
  const startHour: number = ADMIN_TIME_SLOT_CONFIG.START_HOUR;
  const endHour: number = isSaturday ? ADMIN_TIME_SLOT_CONFIG.END_HOUR_SATURDAYS : ADMIN_TIME_SLOT_CONFIG.END_HOUR_WEEKDAYS;
  
  // Generate slots from start hour to end hour (inclusive)
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += ADMIN_TIME_SLOT_CONFIG.CLIENT_INTERVAL_MINUTES) {
      // Skip if this would go beyond the end hour
      if (hour === endHour && minute >= 30) {
        break;
      }
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      slots.push(timeString);
    }
  }
  
  console.log('🔄 [ADMIN_TIME_SLOT_HELPERS] Generated admin slots:', slots);
  return slots;
}

// Get all 10-minute slots needed for a service duration starting at a given time
export function getAdminRequiredBackendSlots(startTime: string, durationMinutes: number, isSaturday: boolean = false): string[] {
  console.log(`🔍 [ADMIN_TIME_SLOT_HELPERS] getAdminRequiredBackendSlots called with startTime: ${startTime}, duration: ${durationMinutes}min, isSaturday: ${isSaturday}`);
  
  const slots: string[] = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  const endHour: number = isSaturday ? ADMIN_TIME_SLOT_CONFIG.END_HOUR_SATURDAYS : ADMIN_TIME_SLOT_CONFIG.END_HOUR_WEEKDAYS;
  
  console.log(`🔍 [ADMIN_TIME_SLOT_HELPERS] Start time breakdown: ${startHour}:${startMinute} = ${startTotalMinutes} total minutes`);
  console.log(`🔍 [ADMIN_TIME_SLOT_HELPERS] End hour: ${endHour} (${isSaturday ? 'Saturday' : 'Weekday'})`);
  
  // Generate all 10-minute slots for the duration
  for (let offset = 0; offset < durationMinutes; offset += ADMIN_TIME_SLOT_CONFIG.BACKEND_INTERVAL_MINUTES) {
    const slotTotalMinutes = startTotalMinutes + offset;
    const slotHour = Math.floor(slotTotalMinutes / 60);
    const slotMinute = slotTotalMinutes % 60;
    
    // Stop if we go beyond business hours
    if (slotHour >= endHour) {
      console.log(`⚠️ [ADMIN_TIME_SLOT_HELPERS] Stopping at ${slotHour}:${slotMinute} - beyond business hours (${endHour}:00)`);
      break;
    }
    
    const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
    console.log(`✅ [ADMIN_TIME_SLOT_HELPERS] Added required slot: ${timeString} (offset: ${offset}min)`);
  }
  
  console.log(`📊 [ADMIN_TIME_SLOT_HELPERS] Required backend slots for ${startTime} + ${durationMinutes}min:`, slots);
  return slots;
}

// Check if a 30-minute admin slot is available (all underlying 10-min slots must be free)
export function isAdminSlotAvailable(
  adminSlot: string, 
  serviceDuration: number, 
  staffAvailability: Array<{ time_slot: string; available: boolean }>,
  isSaturday: boolean = false
): boolean {
  console.log(`\n🔍 [ADMIN_TIME_SLOT_HELPERS] ===== CHECKING ADMIN SLOT AVAILABILITY =====`);
  console.log(`🔍 [ADMIN_TIME_SLOT_HELPERS] Checking admin slot: ${adminSlot}, duration: ${serviceDuration}min, isSaturday: ${isSaturday}`);
  console.log(`📊 [ADMIN_TIME_SLOT_HELPERS] Staff availability data (${staffAvailability.length} records):`, staffAvailability);
  
  const requiredSlots = getAdminRequiredBackendSlots(adminSlot, serviceDuration, isSaturday);
  console.log(`📋 [ADMIN_TIME_SLOT_HELPERS] Required backend slots:`, requiredSlots);
  
  // Create availability lookup for faster checking
  const availabilityMap = new Map();
  staffAvailability.forEach(slot => {
    availabilityMap.set(slot.time_slot, slot.available);
  });
  
  console.log(`🗂️ [ADMIN_TIME_SLOT_HELPERS] Availability map:`, Object.fromEntries(availabilityMap));
  
  // Check each required slot
  for (const requiredSlot of requiredSlots) {
    const isAvailable = availabilityMap.get(requiredSlot);
    
    console.log(`🔍 [ADMIN_TIME_SLOT_HELPERS] Checking required slot ${requiredSlot}: ${isAvailable === true ? 'AVAILABLE' : isAvailable === false ? 'UNAVAILABLE' : 'MISSING'}`);
    
    if (!isAvailable) {
      console.log(`❌ [ADMIN_TIME_SLOT_HELPERS] Admin slot ${adminSlot} UNAVAILABLE - required slot ${requiredSlot} is ${isAvailable === false ? 'marked unavailable' : 'missing from data'}`);
      return false;
    }
  }
  
  console.log(`✅ [ADMIN_TIME_SLOT_HELPERS] Admin slot ${adminSlot} AVAILABLE - all required slots are available`);
  return true;
}

// Format time for admin display
export function formatAdminTimeSlot(timeSlot: string): string {
  const [hour, minute] = timeSlot.split(':');
  return `${hour}:${minute}`;
}

// Build admin availability matrix from raw database data
export function buildAdminAvailabilityMatrix(
  rawAvailabilityData: Array<{ staff_profile_id: string; time_slot: string; available: boolean }>,
  uniqueStaffIds: string[],
  isSaturday: boolean = false
): Record<string, Record<string, boolean>> {
  console.log(`🔧 [ADMIN_TIME_SLOT_HELPERS] Building admin availability matrix`);
  console.log(`📊 [ADMIN_TIME_SLOT_HELPERS] Raw data: ${rawAvailabilityData.length} records`);
  console.log(`👥 [ADMIN_TIME_SLOT_HELPERS] Staff IDs:`, uniqueStaffIds);
  
  // Build availability matrix with correct end hour based on day
  const endHour: number = isSaturday ? 12 : 16; // 12:00 for Saturdays, 16:00 for weekdays
  const all10MinSlots: string[] = [];
  for (let hour = 9; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      all10MinSlots.push(timeString);
    }
  }

  const availabilityMatrix: Record<string, Record<string, boolean>> = {};
  
  // Initialize matrix with all slots as unavailable
  for (const slot of all10MinSlots) {
    availabilityMatrix[slot] = {};
    for (const staffId of uniqueStaffIds) {
      availabilityMatrix[slot][staffId] = false;
    }
  }

  // Fill matrix with actual data from database
  rawAvailabilityData.forEach(record => {
    if (availabilityMatrix[record.time_slot]) {
      availabilityMatrix[record.time_slot][record.staff_profile_id] = record.available;
    }
  });

  console.log(`✅ [ADMIN_TIME_SLOT_HELPERS] Admin availability matrix built with ${Object.keys(availabilityMatrix).length} time slots`);
  return availabilityMatrix;
}

// Test function to verify slot generation and availability checking
export function testAdminSlotGeneration() {
  console.log('🧪 [ADMIN_TIME_SLOT_HELPERS] Testing admin slot generation...');
  
  // Test weekday slots
  const weekdaySlots = generateAdminTimeSlots(false);
  console.log('📅 Weekday slots:', weekdaySlots);
  
  // Test Saturday slots
  const saturdaySlots = generateAdminTimeSlots(true);
  console.log('📅 Saturday slots:', saturdaySlots);
  
  // Test required backend slots for a 60-minute service starting at 12:00
  const requiredSlots = getAdminRequiredBackendSlots('12:00:00', 60, false);
  console.log('⏱️ Required backend slots for 12:00 + 60min:', requiredSlots);
  
  // Test availability checking with mock data
  const mockAvailability = [
    { time_slot: '12:00:00', available: false },
    { time_slot: '12:10:00', available: true },
    { time_slot: '12:20:00', available: true },
    { time_slot: '12:30:00', available: true },
    { time_slot: '12:40:00', available: true },
    { time_slot: '12:50:00', available: true },
    { time_slot: '13:00:00', available: true }
  ];
  
  const isAvailable = isAdminSlotAvailable('12:00:00', 60, mockAvailability, false);
  console.log('✅ Availability test result:', isAvailable);
  
  return {
    weekdaySlots,
    saturdaySlots,
    requiredSlots,
    isAvailable
  };
} 