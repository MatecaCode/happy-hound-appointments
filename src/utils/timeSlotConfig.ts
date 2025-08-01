
// Centralized time slot configuration
export const TIME_SLOT_CONFIG = {
  START_HOUR: 9,
  END_HOUR_WEEKDAYS: 16, // Updated: Last slot at 16:00 for weekdays
  END_HOUR_SATURDAYS: 12, // Updated: Last slot at 12:00 for Saturdays
  SLOT_INTERVAL_MINUTES: 30,
  PROVIDER_DAYS: 90, // Changed from 30 to 90 days
  SHOWER_DAYS: 90,
  SHOWER_SPOTS: 5,
} as const;

// Generate time slots array for frontend use (default to weekdays)
export function generateTimeSlots(isSaturday: boolean = false): string[] {
  const slots: string[] = [];
  const endHour = isSaturday ? TIME_SLOT_CONFIG.END_HOUR_SATURDAYS : TIME_SLOT_CONFIG.END_HOUR_WEEKDAYS;
  const totalSlots = (endHour - TIME_SLOT_CONFIG.START_HOUR) * 2; // 2 slots per hour (30min intervals)
  
  for (let i = 0; i < totalSlots; i++) {
    const hour = TIME_SLOT_CONFIG.START_HOUR + Math.floor(i / 2);
    const minute = (i % 2) * TIME_SLOT_CONFIG.SLOT_INTERVAL_MINUTES;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    slots.push(timeString);
  }
  
  return slots;
}

// Format time slot for display
export function formatTimeSlot(timeSlot: string): string {
  const [hour, minute] = timeSlot.split(':');
  const hourNum = parseInt(hour);
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
  return `${displayHour}:${minute} ${period}`;
}
