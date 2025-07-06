
// Utility functions for handling 10-minute granular time slots

export const TIME_SLOT_CONFIG = {
  CLIENT_INTERVAL_MINUTES: 30, // What clients see (30-min slots)
  BACKEND_INTERVAL_MINUTES: 10, // Backend granularity (10-min slots)
  START_HOUR: 9,
  END_HOUR: 17,
} as const;

// Generate all 10-minute backend slots
export function generateBackendTimeSlots(): string[] {
  const slots: string[] = [];
  const totalMinutes = (TIME_SLOT_CONFIG.END_HOUR - TIME_SLOT_CONFIG.START_HOUR) * 60;
  
  for (let minutes = 0; minutes < totalMinutes; minutes += TIME_SLOT_CONFIG.BACKEND_INTERVAL_MINUTES) {
    const hour = TIME_SLOT_CONFIG.START_HOUR + Math.floor(minutes / 60);
    const minute = minutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
  }
  
  return slots;
}

// Generate 30-minute client-facing slots
export function generateClientTimeSlots(): string[] {
  const slots: string[] = [];
  const totalMinutes = (TIME_SLOT_CONFIG.END_HOUR - TIME_SLOT_CONFIG.START_HOUR) * 60;
  
  for (let minutes = 0; minutes < totalMinutes; minutes += TIME_SLOT_CONFIG.CLIENT_INTERVAL_MINUTES) {
    const hour = TIME_SLOT_CONFIG.START_HOUR + Math.floor(minutes / 60);
    const minute = minutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
  }
  
  return slots;
}

// Get all 10-minute slots needed for a service duration starting at a given time
export function getRequiredBackendSlots(startTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  
  console.log(`🔍 [GET_REQUIRED_SLOTS] Calculating for start=${startTime}, duration=${durationMinutes}min`);
  
  // Generate all 10-minute slots for the duration
  for (let offset = 0; offset < durationMinutes; offset += TIME_SLOT_CONFIG.BACKEND_INTERVAL_MINUTES) {
    const slotTotalMinutes = startTotalMinutes + offset;
    const slotHour = Math.floor(slotTotalMinutes / 60);
    const slotMinute = slotTotalMinutes % 60;
    
    // Stop if we go beyond business hours
    if (slotHour >= TIME_SLOT_CONFIG.END_HOUR) {
      console.log(`⚠️ [GET_REQUIRED_SLOTS] Stopping at ${slotHour}:${slotMinute} - beyond business hours`);
      break;
    }
    
    const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
  }
  
  console.log(`✅ [GET_REQUIRED_SLOTS] Generated ${slots.length} slots:`, slots);
  return slots;
}

// Check if a 30-minute client slot is available (all underlying 10-min slots must be free)
export function isClientSlotAvailable(
  clientSlot: string, 
  serviceDuration: number, 
  staffAvailability: Array<{ time_slot: string; available: boolean }>
): boolean {
  const requiredSlots = getRequiredBackendSlots(clientSlot, serviceDuration);
  
  console.log(`🔍 [SLOT_CHECK] ==========================================`);
  console.log(`🔍 [SLOT_CHECK] Checking client slot: ${clientSlot}`);
  console.log(`🔍 [SLOT_CHECK] Service duration: ${serviceDuration} minutes`);
  console.log(`🔍 [SLOT_CHECK] Required 10-min slots:`, requiredSlots);
  console.log(`🔍 [SLOT_CHECK] Total staff availability records: ${staffAvailability.length}`);
  
  // Create availability lookup for faster checking
  const availabilityMap = new Map();
  staffAvailability.forEach(slot => {
    availabilityMap.set(slot.time_slot, slot.available);
  });
  
  console.log(`🔍 [SLOT_CHECK] Availability map created with ${availabilityMap.size} entries`);
  
  // Check each required slot
  const slotDetails: Array<{slot: string, available: boolean | undefined, found: boolean}> = [];
  
  for (const requiredSlot of requiredSlots) {
    const isAvailable = availabilityMap.get(requiredSlot);
    const found = availabilityMap.has(requiredSlot);
    
    slotDetails.push({
      slot: requiredSlot,
      available: isAvailable,
      found: found
    });
    
    if (!found) {
      console.log(`❌ [SLOT_CHECK] MISSING: No availability record found for ${requiredSlot}`);
      console.log(`❌ [SLOT_CHECK] Result: Client slot ${clientSlot} is NOT available (missing data)`);
      return false;
    }
    
    if (!isAvailable) {
      console.log(`❌ [SLOT_CHECK] UNAVAILABLE: Slot ${requiredSlot} is not available`);
      console.log(`❌ [SLOT_CHECK] Result: Client slot ${clientSlot} is NOT available`);
      return false;
    }
  }
  
  // Log detailed breakdown
  console.log(`📊 [SLOT_CHECK] Detailed slot breakdown:`);
  slotDetails.forEach(detail => {
    const status = !detail.found ? 'MISSING' : 
                   detail.available ? 'AVAILABLE' : 'UNAVAILABLE';
    console.log(`    ${detail.slot}: ${status}`);
  });
  
  console.log(`✅ [SLOT_CHECK] ALL CHECKS PASSED: Client slot ${clientSlot} is AVAILABLE`);
  return true;
}

// Format time for display
export function formatTimeSlot(timeSlot: string): string {
  const [hour, minute] = timeSlot.split(':');
  return `${hour}:${minute}`;
}

// Debug function to create a summary table
export function createAvailabilitySummaryTable(
  staffAvailability: Array<{ time_slot: string; available: boolean }>,
  date: string,
  staffId: string,
  serviceDuration: number
) {
  console.log(`📋 [AVAILABILITY_SUMMARY] ==========================================`);
  console.log(`📋 [AVAILABILITY_SUMMARY] Date: ${date}`);
  console.log(`📋 [AVAILABILITY_SUMMARY] Staff ID: ${staffId}`);
  console.log(`📋 [AVAILABILITY_SUMMARY] Service Duration: ${serviceDuration} minutes`);
  console.log(`📋 [AVAILABILITY_SUMMARY] Total Records: ${staffAvailability.length}`);
  
  // Generate all possible 10-minute slots for the day
  const allBackendSlots = generateBackendTimeSlots();
  
  // Create lookup map
  const availabilityMap = new Map();
  staffAvailability.forEach(slot => {
    availabilityMap.set(slot.time_slot, slot.available);
  });
  
  console.log(`📋 [AVAILABILITY_SUMMARY] 10-Minute Slot Availability Table:`);
  console.log(`Time     | Available | Status`);
  console.log(`---------|-----------|--------`);
  
  allBackendSlots.forEach(slot => {
    const available = availabilityMap.get(slot);
    const status = available === undefined ? 'MISSING' : 
                   available ? 'FREE' : 'BOOKED';
    console.log(`${slot} | ${available === undefined ? '   -   ' : available ? '  YES   ' : '   NO  '} | ${status}`);
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
  
  // Check which 30-minute slots should be available
  const clientSlots = generateClientTimeSlots();
  console.log(`📋 [AVAILABILITY_SUMMARY] 30-Minute Client Slot Analysis:`);
  console.log(`Client Slot | Should Show | Reason`);
  console.log(`------------|-------------|--------`);
  
  clientSlots.forEach(clientSlot => {
    const shouldShow = isClientSlotAvailable(clientSlot, serviceDuration, staffAvailability);
    const reason = shouldShow ? 'All 10-min slots available' : 'Some 10-min slots unavailable/missing';
    console.log(`${clientSlot}    | ${shouldShow ? '    YES    ' : '     NO    '} | ${reason}`);
  });
  
  console.log(`📋 [AVAILABILITY_SUMMARY] ==========================================`);
}
