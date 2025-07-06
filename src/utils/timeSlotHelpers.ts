
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
  
  // Generate all 10-minute slots for the duration
  for (let offset = 0; offset < durationMinutes; offset += TIME_SLOT_CONFIG.BACKEND_INTERVAL_MINUTES) {
    const slotTotalMinutes = startTotalMinutes + offset;
    const slotHour = Math.floor(slotTotalMinutes / 60);
    const slotMinute = slotTotalMinutes % 60;
    
    // Stop if we go beyond business hours
    if (slotHour >= TIME_SLOT_CONFIG.END_HOUR) break;
    
    const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
  }
  
  return slots;
}

// Check if a 30-minute client slot is available (all underlying 10-min slots must be free)
export function isClientSlotAvailable(
  clientSlot: string, 
  serviceDuration: number, 
  staffAvailability: Array<{ time_slot: string; available: boolean }>
): boolean {
  const requiredSlots = getRequiredBackendSlots(clientSlot, serviceDuration);
  
  console.log(`🔍 [SLOT_CHECK] Checking client slot ${clientSlot} for ${serviceDuration}min service`);
  console.log(`🔍 [SLOT_CHECK] Required 10-min slots:`, requiredSlots);
  
  // Check if ALL required 10-minute slots are available
  for (const requiredSlot of requiredSlots) {
    const availability = staffAvailability.find(slot => slot.time_slot === requiredSlot);
    
    if (!availability || !availability.available) {
      console.log(`❌ [SLOT_CHECK] Slot ${requiredSlot} not available`);
      return false;
    }
  }
  
  console.log(`✅ [SLOT_CHECK] Client slot ${clientSlot} is fully available`);
  return true;
}

// Format time for display
export function formatTimeSlot(timeSlot: string): string {
  const [hour, minute] = timeSlot.split(':');
  return `${hour}:${minute}`;
}
