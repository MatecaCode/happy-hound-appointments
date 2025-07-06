
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
      // Get all possible time slots for the day
      const timeSlots = [];
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          const startTime = new Date(`1970-01-01T${timeStr}`);
          const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
          
          // Skip if service would end after business hours
          if (endTime.getHours() > 17 || (endTime.getHours() === 17 && endTime.getMinutes() > 0)) {
            continue;
          }
          
          timeSlots.push(timeStr);
        }
      }

      // Check if any time slot has availability for all selected staff
      for (const timeSlot of timeSlots) {
        let allStaffAvailable = true;
        
        for (const staffId of selectedStaffIds) {
          // Check if this staff member is available for the entire service duration
          let staffAvailable = true;
          
          for (let offset = 0; offset < serviceDuration; offset += 30) {
            const checkTime = new Date(`1970-01-01T${timeSlot}`);
            checkTime.setMinutes(checkTime.getMinutes() + offset);
            const checkTimeStr = `${checkTime.getHours().toString().padStart(2, '0')}:${checkTime.getMinutes().toString().padStart(2, '0')}:00`;
            
            const { data: availability } = await supabase
              .from('staff_availability')
              .select('available')
              .eq('staff_profile_id', staffId)
              .eq('date', dateStr)
              .eq('time_slot', checkTimeStr)
              .eq('available', true)
              .maybeSingle();
            
            if (!availability) {
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
          return true; // Found at least one available slot
        }
      }
      
      return false; // No available slots found
    } catch (error) {
      console.error('Error checking date availability:', error);
      return false;
    }
  }, [selectedStaffIds, serviceDuration]);

  const updateUnavailableDates = useCallback(async () => {
    if (selectedStaffIds.length === 0) {
      setUnavailableDates(new Set());
      return;
    }

    setIsLoading(true);
    const unavailableDatesSet = new Set<string>();
    
    // Check next 90 days
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      // Skip Sundays
      if (checkDate.getDay() === 0) {
        unavailableDatesSet.add(checkDate.toISOString().split('T')[0]);
        continue;
      }
      
      const isAvailable = await checkDateAvailability(checkDate);
      if (!isAvailable) {
        unavailableDatesSet.add(checkDate.toISOString().split('T')[0]);
      }
    }
    
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
    return unavailableDates.has(dateStr);
  }, [unavailableDates]);

  return {
    isDateDisabled,
    isLoading,
    checkDateAvailability
  };
};
