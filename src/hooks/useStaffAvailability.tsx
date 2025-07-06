
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseStaffAvailabilityParams {
  selectedStaffIds: string[];
  serviceDuration: number;
}

export const useStaffAvailability = ({ selectedStaffIds, serviceDuration }: UseStaffAvailabilityParams) => {
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const checkDateAvailability = useCallback(async (date: Date): Promise<boolean> => {
    if (selectedStaffIds.length === 0) return true;

    const dateStr = date.toISOString().split('T')[0];
    
    try {
      // Get all possible time slots for the day (every 30 minutes from 9:00 to 16:30)
      const timeSlots = [];
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          const startTime = new Date(`1970-01-01T${timeStr}`);
          const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
          
          // Skip if service would end after business hours (17:00)
          if (endTime.getHours() > 17 || (endTime.getHours() === 17 && endTime.getMinutes() > 0)) {
            continue;
          }
          
          timeSlots.push(timeStr);
        }
      }

      console.log(`🔍 [AVAILABILITY_CHECK] Checking ${timeSlots.length} time slots for date ${dateStr}`);

      // Check if any time slot has availability for all selected staff for the full duration
      for (const timeSlot of timeSlots) {
        let allStaffAvailable = true;
        
        // Check each selected staff member
        for (const staffId of selectedStaffIds) {
          let staffAvailable = true;
          
          // Check all 30-minute segments within the service duration
          for (let offset = 0; offset < serviceDuration; offset += 30) {
            const checkTime = new Date(`1970-01-01T${timeSlot}`);
            checkTime.setMinutes(checkTime.getMinutes() + offset);
            const checkTimeStr = `${checkTime.getHours().toString().padStart(2, '0')}:${checkTime.getMinutes().toString().padStart(2, '0')}:00`;
            
            // Query staff_availability table for this specific staff, date, and time
            const { data: availability, error } = await supabase
              .from('staff_availability')
              .select('available')
              .eq('staff_profile_id', staffId)
              .eq('date', dateStr)
              .eq('time_slot', checkTimeStr)
              .eq('available', true)
              .maybeSingle();
            
            if (error) {
              console.error(`❌ [AVAILABILITY_CHECK] Error checking availability:`, error);
              staffAvailable = false;
              break;
            }
            
            if (!availability) {
              console.log(`❌ [AVAILABILITY_CHECK] Staff ${staffId} not available at ${dateStr} ${checkTimeStr}`);
              staffAvailable = false;
              break;
            }
          }
          
          if (!staffAvailable) {
            allStaffAvailable = false;
            break;
          }
        }
        
        if (allStaffAvailable) {
          console.log(`✅ [AVAILABILITY_CHECK] Found available slot at ${dateStr} ${timeSlot}`);
          return true; // Found at least one available slot for all staff
        }
      }
      
      console.log(`❌ [AVAILABILITY_CHECK] No available slots found for date ${dateStr}`);
      return false; // No available slots found
    } catch (error) {
      console.error('❌ [AVAILABILITY_CHECK] Error checking date availability:', error);
      return false;
    }
  }, [selectedStaffIds, serviceDuration]);

  const updateUnavailableDates = useCallback(async () => {
    if (selectedStaffIds.length === 0) {
      setUnavailableDates(new Set());
      return;
    }

    console.log(`🔄 [AVAILABILITY_UPDATE] Updating availability for ${selectedStaffIds.length} staff members`);
    setIsLoading(true);
    const unavailableDatesSet = new Set<string>();
    
    // Check next 90 days
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      // Skip Sundays (day 0)
      if (checkDate.getDay() === 0) {
        unavailableDatesSet.add(checkDate.toISOString().split('T')[0]);
        continue;
      }
      
      const isAvailable = await checkDateAvailability(checkDate);
      if (!isAvailable) {
        unavailableDatesSet.add(checkDate.toISOString().split('T')[0]);
      }
    }
    
    console.log(`✅ [AVAILABILITY_UPDATE] Found ${unavailableDatesSet.size} unavailable dates out of 90 checked`);
    setUnavailableDates(unavailableDatesSet);
    setIsLoading(false);
  }, [selectedStaffIds, checkDateAvailability]);

  useEffect(() => {
    updateUnavailableDates();
  }, [updateUnavailableDates]);

  const isDateDisabled = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (date < today) {
      return true;
    }
    
    // Disable Sundays
    if (date.getDay() === 0) {
      return true;
    }
    
    // Disable dates with no staff availability
    const dateStr = date.toISOString().split('T')[0];
    const isUnavailable = unavailableDates.has(dateStr);
    
    if (isUnavailable) {
      console.log(`🚫 [DATE_DISABLED] Date ${dateStr} is disabled - no staff availability`);
    }
    
    return isUnavailable;
  }, [unavailableDates]);

  return {
    isDateDisabled,
    isLoading,
    checkDateAvailability
  };
};
