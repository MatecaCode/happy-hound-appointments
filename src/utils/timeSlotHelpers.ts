
// Utility functions for handling 10-minute granular time slots with timezone awareness

import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz';
import { format } from 'date-fns';

export const TIME_SLOT_CONFIG = {
  CLIENT_INTERVAL_MINUTES: 30, // What clients see (30-min slots)
  BACKEND_INTERVAL_MINUTES: 10, // Backend granularity (10-min slots)
  START_HOUR: 9,
  END_HOUR: 17,
  TIMEZONE: 'America/Sao_Paulo' // Standardize to Brazil timezone
} as const;

// Timezone debugging helper
function logTimezoneInfo(label: string, timeString: string, date?: Date) {
  const localDate = date || new Date(`2024-01-01T${timeString}`);
  const utcTime = format(localDate, 'HH:mm:ss');
  const spTime = formatTz(localDate, 'HH:mm:ss', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
  
  console.log(`🕐 [TIMEZONE_DEBUG] ${label}: input="${timeString}", UTC="${utcTime}", SP="${spTime}"`);
}

// Generate all 10-minute backend slots
export function generateBackendTimeSlots(): string[] {
  const slots: string[] = [];
  const totalMinutes = (TIME_SLOT_CONFIG.END_HOUR - TIME_SLOT_CONFIG.START_HOUR) * 60;
  
  console.log(`🕐 [TIMEZONE_DEBUG] Generating backend slots in ${TIME_SLOT_CONFIG.TIMEZONE}`);
  
  for (let minutes = 0; minutes < totalMinutes; minutes += TIME_SLOT_CONFIG.BACKEND_INTERVAL_MINUTES) {
    const hour = TIME_SLOT_CONFIG.START_HOUR + Math.floor(minutes / 60);
    const minute = minutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
    
    if (minutes < 60) { // Only log first hour for brevity
      logTimezoneInfo(`Backend slot ${slots.length}`, timeString);
    }
  }
  
  console.log(`🕐 [TIMEZONE_DEBUG] Generated ${slots.length} backend slots`);
  return slots;
}

// Generate 30-minute client-facing slots
export function generateClientTimeSlots(): string[] {
  const slots: string[] = [];
  const totalMinutes = (TIME_SLOT_CONFIG.END_HOUR - TIME_SLOT_CONFIG.START_HOUR) * 60;
  
  console.log(`🕐 [TIMEZONE_DEBUG] Generating client slots in ${TIME_SLOT_CONFIG.TIMEZONE}`);
  
  for (let minutes = 0; minutes < totalMinutes; minutes += TIME_SLOT_CONFIG.CLIENT_INTERVAL_MINUTES) {
    const hour = TIME_SLOT_CONFIG.START_HOUR + Math.floor(minutes / 60);
    const minute = minutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
    
    logTimezoneInfo(`Client slot ${slots.length}`, timeString);
  }
  
  console.log(`🕐 [TIMEZONE_DEBUG] Generated ${slots.length} client slots`);
  return slots;
}

// Get all 10-minute slots needed for a service duration starting at a given time
export function getRequiredBackendSlots(startTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  
  console.log(`🔍 [GET_REQUIRED_SLOTS] [TIMEZONE_DEBUG] ==========================================`);
  console.log(`🔍 [GET_REQUIRED_SLOTS] Calculating for start=${startTime}, duration=${durationMinutes}min in ${TIME_SLOT_CONFIG.TIMEZONE}`);
  logTimezoneInfo('Start time', startTime);
  
  // Generate all 10-minute slots for the duration
  for (let offset = 0; offset < durationMinutes; offset += TIME_SLOT_CONFIG.BACKEND_INTERVAL_MINUTES) {
    const slotTotalMinutes = startTotalMinutes + offset;
    const slotHour = Math.floor(slotTotalMinutes / 60);
    const slotMinute = slotTotalMinutes % 60;
    
    // Stop if we go beyond business hours
    if (slotHour >= TIME_SLOT_CONFIG.END_HOUR) {
      console.log(`⚠️ [GET_REQUIRED_SLOTS] [TIMEZONE_DEBUG] Stopping at ${slotHour}:${slotMinute} - beyond business hours in ${TIME_SLOT_CONFIG.TIMEZONE}`);
      break;
    }
    
    const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
    
    if (offset < 60) { // Log first hour for debugging
      logTimezoneInfo(`Required slot ${slots.length}`, timeString);
    }
  }
  
  console.log(`✅ [GET_REQUIRED_SLOTS] [TIMEZONE_DEBUG] Generated ${slots.length} slots for ${TIME_SLOT_CONFIG.TIMEZONE}:`, slots);
  return slots;
}

// Check if a 30-minute client slot is available (all underlying 10-min slots must be free)
export function isClientSlotAvailable(
  clientSlot: string, 
  serviceDuration: number, 
  staffAvailability: Array<{ time_slot: string; available: boolean }>
): boolean {
  const requiredSlots = getRequiredBackendSlots(clientSlot, serviceDuration);
  
  console.log(`🔍 [SLOT_CHECK] [TIMEZONE_DEBUG] ==========================================`);
  console.log(`🔍 [SLOT_CHECK] Checking client slot: ${clientSlot} in ${TIME_SLOT_CONFIG.TIMEZONE}`);
  logTimezoneInfo('Client slot being checked', clientSlot);
  console.log(`🔍 [SLOT_CHECK] Service duration: ${serviceDuration} minutes`);
  console.log(`🔍 [SLOT_CHECK] Required 10-min slots:`, requiredSlots);
  console.log(`🔍 [SLOT_CHECK] Total staff availability records: ${staffAvailability.length}`);
  
  // Log timezone info for staff availability
  console.log(`🕐 [TIMEZONE_DEBUG] Staff availability sample (first 5 records):`);
  staffAvailability.slice(0, 5).forEach((record, index) => {
    logTimezoneInfo(`Staff record ${index + 1}`, record.time_slot);
    console.log(`  Available: ${record.available}`);
  });
  
  // Create availability lookup for faster checking
  const availabilityMap = new Map();
  staffAvailability.forEach(slot => {
    availabilityMap.set(slot.time_slot, slot.available);
  });
  
  console.log(`🔍 [SLOT_CHECK] [TIMEZONE_DEBUG] Availability map created with ${availabilityMap.size} entries in ${TIME_SLOT_CONFIG.TIMEZONE}`);
  
  // Check each required slot with timezone logging
  const slotDetails: Array<{slot: string, available: boolean | undefined, found: boolean}> = [];
  
  for (const requiredSlot of requiredSlots) {
    const isAvailable = availabilityMap.get(requiredSlot);
    const found = availabilityMap.has(requiredSlot);
    
    slotDetails.push({
      slot: requiredSlot,
      available: isAvailable,
      found: found
    });
    
    logTimezoneInfo(`Checking required slot`, requiredSlot);
    
    if (!found) {
      console.log(`❌ [SLOT_CHECK] [TIMEZONE_DEBUG] MISSING: No availability record found for ${requiredSlot} in ${TIME_SLOT_CONFIG.TIMEZONE}`);
      console.log(`❌ [SLOT_CHECK] Result: Client slot ${clientSlot} is NOT available (missing data)`);
      return false;
    }
    
    if (!isAvailable) {
      console.log(`❌ [SLOT_CHECK] [TIMEZONE_DEBUG] UNAVAILABLE: Slot ${requiredSlot} is not available in ${TIME_SLOT_CONFIG.TIMEZONE}`);
      console.log(`❌ [SLOT_CHECK] Result: Client slot ${clientSlot} is NOT available`);
      return false;
    }
  }
  
  // Log detailed breakdown with timezone info
  console.log(`📊 [SLOT_CHECK] [TIMEZONE_DEBUG] Detailed slot breakdown for ${TIME_SLOT_CONFIG.TIMEZONE}:`);
  slotDetails.forEach(detail => {
    const status = !detail.found ? 'MISSING' : 
                   detail.available ? 'AVAILABLE' : 'UNAVAILABLE';
    console.log(`    ${detail.slot}: ${status}`);
    logTimezoneInfo(`    Detail for`, detail.slot);
  });
  
  console.log(`✅ [SLOT_CHECK] [TIMEZONE_DEBUG] ALL CHECKS PASSED: Client slot ${clientSlot} is AVAILABLE in ${TIME_SLOT_CONFIG.TIMEZONE}`);
  return true;
}

// Format time for display (timezone-aware)
export function formatTimeSlot(timeSlot: string): string {
  try {
    const [hour, minute] = timeSlot.split(':');
    const dateTime = new Date(`2024-01-01T${hour}:${minute}:00`);
    const formatted = formatTz(dateTime, 'HH:mm', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
    
    console.log(`🕐 [TIMEZONE_DEBUG] Format: input="${timeSlot}", output="${formatted}" in ${TIME_SLOT_CONFIG.TIMEZONE}`);
    return formatted;
  } catch (error) {
    console.error(`❌ [TIMEZONE_DEBUG] Error formatting time slot ${timeSlot}:`, error);
    return timeSlot.substring(0, 5); // Fallback
  }
}

// Debug function to create a summary table with timezone awareness
export function createAvailabilitySummaryTable(
  staffAvailability: Array<{ time_slot: string; available: boolean }>,
  date: string,
  staffId: string,
  serviceDuration: number
) {
  console.log(`📋 [AVAILABILITY_SUMMARY] [TIMEZONE_DEBUG] ==========================================`);
  console.log(`📋 [AVAILABILITY_SUMMARY] Date: ${date} (${TIME_SLOT_CONFIG.TIMEZONE})`);
  console.log(`📋 [AVAILABILITY_SUMMARY] Staff ID: ${staffId}`);
  console.log(`📋 [AVAILABILITY_SUMMARY] Service Duration: ${serviceDuration} minutes`);
  console.log(`📋 [AVAILABILITY_SUMMARY] Total Records: ${staffAvailability.length}`);
  console.log(`📋 [AVAILABILITY_SUMMARY] Timezone: ${TIME_SLOT_CONFIG.TIMEZONE}`);
  
  // Log the date parsing
  try {
    const parsedDate = new Date(date);
    const utcDate = format(parsedDate, 'yyyy-MM-dd');
    const spDate = formatTz(parsedDate, 'yyyy-MM-dd', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
    console.log(`🕐 [TIMEZONE_DEBUG] Date parsing: input="${date}", UTC="${utcDate}", SP="${spDate}"`);
  } catch (error) {
    console.error(`❌ [TIMEZONE_DEBUG] Error parsing date ${date}:`, error);
  }
  
  // Generate all possible 10-minute slots for the day
  const allBackendSlots = generateBackendTimeSlots();
  
  // Create lookup map
  const availabilityMap = new Map();
  staffAvailability.forEach(slot => {
    availabilityMap.set(slot.time_slot, slot.available);
  });
  
  console.log(`📋 [AVAILABILITY_SUMMARY] [TIMEZONE_DEBUG] 10-Minute Slot Availability Table (${TIME_SLOT_CONFIG.TIMEZONE}):`);
  console.log(`Time     | Available | Status   | UTC Time | SP Time`);
  console.log(`---------|-----------|----------|----------|--------`);
  
  allBackendSlots.forEach(slot => {
    const available = availabilityMap.get(slot);
    const status = available === undefined ? 'MISSING' : 
                   available ? 'FREE' : 'BOOKED';
    
    try {
      const dateTime = new Date(`2024-01-01T${slot}`);
      const utcTime = format(dateTime, 'HH:mm:ss');
      const spTime = formatTz(dateTime, 'HH:mm:ss', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
      
      console.log(`${slot} | ${available === undefined ? '   -   ' : available ? '  YES   ' : '   NO  '} | ${status.padEnd(8)} | ${utcTime} | ${spTime}`);
    } catch (error) {
      console.log(`${slot} | ${available === undefined ? '   -   ' : available ? '  YES   ' : '   NO  '} | ${status.padEnd(8)} | ERROR    | ERROR`);
    }
  });
  
  // Identify continuous blocks
  console.log(`📋 [AVAILABILITY_SUMMARY] Continuous Available Blocks:`);
  let currentBlock: string[] = [];
  let blocks: Array<{start: string, end: string, duration: number}> = [];
  
  allBackendSlots.forEach((slot, index) => {
    const available = availabilityMap.get(slot);
    
    if (available === true) {
      currentBlock.push(slot);
    } else {
      if (currentBlock.length > 0) {
        const blockDuration = currentBlock.length * 10; // 10 minutes per slot
        blocks.push({
          start: currentBlock[0],
          end: currentBlock[currentBlock.length - 1],
          duration: blockDuration
        });
        currentBlock = [];
      }
    }
  });
  
  // Don't forget the last block if it ends at the day boundary
  if (currentBlock.length > 0) {
    const blockDuration = currentBlock.length * 10;
    blocks.push({
      start: currentBlock[0],
      end: currentBlock[currentBlock.length - 1],
      duration: blockDuration
    });
  }
  
  console.log(`Found ${blocks.length} continuous blocks:`);
  blocks.forEach((block, index) => {
    const canFitService = block.duration >= serviceDuration;
    console.log(`  Block ${index + 1}: ${block.start} - ${block.end} (${block.duration} min) ${canFitService ? '✅ CAN FIT SERVICE' : '❌ TOO SHORT'}`);
  });
  
  // Check which 30-minute slots should be available with timezone logging
  const clientSlots = generateClientTimeSlots();
  console.log(`📋 [AVAILABILITY_SUMMARY] [TIMEZONE_DEBUG] 30-Minute Client Slot Analysis (${TIME_SLOT_CONFIG.TIMEZONE}):`);
  console.log(`Client Slot | Should Show | Reason            | UTC Time | SP Time`);
  console.log(`------------|-------------|-------------------|----------|--------`);
  
  clientSlots.forEach(clientSlot => {
    const shouldShow = isClientSlotAvailable(clientSlot, serviceDuration, staffAvailability);
    const reason = shouldShow ? 'All 10-min available' : 'Some 10-min unavailable';
    
    try {
      const dateTime = new Date(`2024-01-01T${clientSlot}`);
      const utcTime = format(dateTime, 'HH:mm:ss');
      const spTime = formatTz(dateTime, 'HH:mm:ss', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
      
      console.log(`${clientSlot}    | ${shouldShow ? '    YES    ' : '     NO    '} | ${reason.padEnd(17)} | ${utcTime} | ${spTime}`);
    } catch (error) {
      console.log(`${clientSlot}    | ${shouldShow ? '    YES    ' : '     NO    '} | ${reason.padEnd(17)} | ERROR    | ERROR`);
    }
  });
  
  console.log(`📋 [AVAILABILITY_SUMMARY] [TIMEZONE_DEBUG] ==========================================`);
}
