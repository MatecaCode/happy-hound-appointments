
// Simple utility functions for handling time slots

import { format } from 'date-fns';

export const TIME_SLOT_CONFIG = {
  CLIENT_INTERVAL_MINUTES: 30, // What clients see (30-min slots)
  BACKEND_INTERVAL_MINUTES: 10, // Backend granularity (10-min slots)
  START_HOUR: 9,
  END_HOUR: 17,
  TIMEZONE: 'America/Sao_Paulo'
} as const;

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
  
  console.log('🔄 [TIME_SLOT_HELPERS] Generated client slots:', slots);
  return slots;
}

// Get all 10-minute slots needed for a service duration starting at a given time
export function getRequiredBackendSlots(startTime: string, durationMinutes: number): string[] {
  console.log(`🔍 [TIME_SLOT_HELPERS] getRequiredBackendSlots called with startTime: ${startTime}, duration: ${durationMinutes}min`);
  
  const slots: string[] = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  
  console.log(`🔍 [TIME_SLOT_HELPERS] Start time breakdown: ${startHour}:${startMinute} = ${startTotalMinutes} total minutes`);
  
  // Generate all 10-minute slots for the duration
  for (let offset = 0; offset < durationMinutes; offset += TIME_SLOT_CONFIG.BACKEND_INTERVAL_MINUTES) {
    const slotTotalMinutes = startTotalMinutes + offset;
    const slotHour = Math.floor(slotTotalMinutes / 60);
    const slotMinute = slotTotalMinutes % 60;
    
    // Stop if we go beyond business hours
    if (slotHour >= TIME_SLOT_CONFIG.END_HOUR) {
      console.log(`⚠️ [TIME_SLOT_HELPERS] Stopping at ${slotHour}:${slotMinute} - beyond business hours`);
      break;
    }
    
    const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
    console.log(`✅ [TIME_SLOT_HELPERS] Added required slot: ${timeString} (offset: ${offset}min)`);
  }
  
  console.log(`📊 [TIME_SLOT_HELPERS] Required backend slots for ${startTime} + ${durationMinutes}min:`, slots);
  return slots;
}

// Check if a 30-minute client slot is available (all underlying 10-min slots must be free)
export function isClientSlotAvailable(
  clientSlot: string, 
  serviceDuration: number, 
  staffAvailability: Array<{ time_slot: string; available: boolean }>
): boolean {
  console.log(`\n🔍 [TIME_SLOT_HELPERS] ===== CHECKING CLIENT SLOT AVAILABILITY =====`);
  console.log(`🔍 [TIME_SLOT_HELPERS] Checking client slot: ${clientSlot}, duration: ${serviceDuration}min`);
  console.log(`📊 [TIME_SLOT_HELPERS] Staff availability data (${staffAvailability.length} records):`, staffAvailability);
  
  const requiredSlots = getRequiredBackendSlots(clientSlot, serviceDuration);
  console.log(`📋 [TIME_SLOT_HELPERS] Required backend slots:`, requiredSlots);
  
  // Create availability lookup for faster checking
  const availabilityMap = new Map();
  staffAvailability.forEach(slot => {
    availabilityMap.set(slot.time_slot, slot.available);
  });
  
  console.log(`🗂️ [TIME_SLOT_HELPERS] Availability map:`, Object.fromEntries(availabilityMap));
  
  // Check each required slot
  for (const requiredSlot of requiredSlots) {
    const isAvailable = availabilityMap.get(requiredSlot);
    
    console.log(`🔍 [TIME_SLOT_HELPERS] Checking required slot ${requiredSlot}: ${isAvailable === true ? 'AVAILABLE' : isAvailable === false ? 'UNAVAILABLE' : 'MISSING'}`);
    
    if (!isAvailable) {
      console.log(`❌ [TIME_SLOT_HELPERS] Client slot ${clientSlot} UNAVAILABLE - required slot ${requiredSlot} is ${isAvailable === false ? 'marked unavailable' : 'missing from data'}`);
      return false;
    }
  }
  
  console.log(`✅ [TIME_SLOT_HELPERS] Client slot ${clientSlot} AVAILABLE - all required slots are available`);
  return true;
}

// Format time for display
export function formatTimeSlot(timeSlot: string): string {
  const [hour, minute] = timeSlot.split(':');
  return `${hour}:${minute}`;
}
