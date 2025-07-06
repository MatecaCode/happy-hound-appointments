
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseStaffAvailabilityParams {
  selectedStaffIds: string[];
  serviceDuration: number;
}

export const useStaffAvailability = ({ selectedStaffIds, serviceDuration }: UseStaffAvailabilityParams) => {
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const checkBatchAvailability = useCallback(async (): Promise<Set<string>> => {
    if (selectedStaffIds.length === 0) return new Set();

    console.log(`🔄 [BATCH_AVAILABILITY] Checking availability for ${selectedStaffIds.length} staff members`);
    
    try {
      // Check next 90 days in batches
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 90);
      
      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch all availability data for the date range and selected staff in one query
      const { data: availabilityData, error } = await supabase
        .from('staff_availability')
        .select('staff_profile_id, date, time_slot, available')
        .in('staff_profile_id', selectedStaffIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .eq('available', true);

      if (error) {
        console.error('❌ [BATCH_AVAILABILITY] Error fetching availability:', error);
        return new Set();
      }

      console.log(`📊 [BATCH_AVAILABILITY] Fetched ${availabilityData?.length || 0} availability records`);

      // Group availability by date
      const availabilityByDate = new Map<string, Map<string, Set<string>>>();
      
      availabilityData?.forEach(record => {
        if (!availabilityByDate.has(record.date)) {
          availabilityByDate.set(record.date, new Map());
        }
        
        const dateAvailability = availabilityByDate.get(record.date)!;
        if (!dateAvailability.has(record.staff_profile_id)) {
          dateAvailability.set(record.staff_profile_id, new Set());
        }
        
        dateAvailability.get(record.staff_profile_id)!.add(record.time_slot);
      });

      const unavailableDatesSet = new Set<string>();

      // Check each date in the 90-day range
      for (let i = 0; i < 90; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        // Create consistent date string format
        const year = checkDate.getFullYear();
        const month = (checkDate.getMonth() + 1).toString().padStart(2, '0');
        const day = checkDate.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Skip Sundays (day 0) - they should be unavailable
        if (checkDate.getDay() === 0) {
          unavailableDatesSet.add(dateStr);
          console.log(`🚫 [BATCH_AVAILABILITY] Skipping Sunday: ${dateStr}`);
          continue;
        }

        const dateAvailability = availabilityByDate.get(dateStr);
        if (!dateAvailability) {
          // No availability data for this date
          unavailableDatesSet.add(dateStr);
          console.log(`❌ [BATCH_AVAILABILITY] No availability data for: ${dateStr} (${checkDate.toLocaleDateString('pt-BR', { weekday: 'long' })})`);
          continue;
        }

        // Debug logging for Mondays
        if (checkDate.getDay() === 1) { // Monday
          console.log(`🔍 [BATCH_AVAILABILITY] Monday check for ${dateStr}:`, {
            dayOfWeek: checkDate.getDay(),
            dateAvailability: Array.from(dateAvailability.keys()),
            selectedStaffIds
          });
        }

        // Check if all selected staff have availability for at least one complete time slot
        let hasAvailableSlot = false;

        // Generate possible time slots (every 30 minutes from 9:00 to 16:30)
        for (let hour = 9; hour < 17; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            const startTime = new Date(`1970-01-01T${timeStr}`);
            const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
            
            // Skip if service would end after business hours (17:00)
            if (endTime.getHours() > 17 || (endTime.getHours() === 17 && endTime.getMinutes() > 0)) {
              continue;
            }

            // Check if all selected staff are available for the full duration
            let allStaffAvailable = true;
            
            for (const staffId of selectedStaffIds) {
              const staffTimeSlots = dateAvailability.get(staffId);
              if (!staffTimeSlots) {
                allStaffAvailable = false;
                if (checkDate.getDay() === 1) { // Monday debug
                  console.log(`🔍 [BATCH_AVAILABILITY] Monday: Staff ${staffId} has no time slots for ${dateStr}`);
                }
                break;
              }

              // Check all required time segments for this service duration
              let staffAvailableForDuration = true;
              for (let offset = 0; offset < serviceDuration; offset += 30) {
                const checkTime = new Date(`1970-01-01T${timeStr}`);
                checkTime.setMinutes(checkTime.getMinutes() + offset);
                const checkTimeStr = `${checkTime.getHours().toString().padStart(2, '0')}:${checkTime.getMinutes().toString().padStart(2, '0')}:00`;
                
                if (!staffTimeSlots.has(checkTimeStr)) {
                  staffAvailableForDuration = false;
                  break;
                }
              }
              
              if (!staffAvailableForDuration) {
                allStaffAvailable = false;
                break;
              }
            }

            if (allStaffAvailable) {
              hasAvailableSlot = true;
              if (checkDate.getDay() === 1) { // Monday debug
                console.log(`✅ [BATCH_AVAILABILITY] Monday ${dateStr} has available slot at ${timeStr}`);
              }
              break;
            }
          }
          
          if (hasAvailableSlot) break;
        }

        if (!hasAvailableSlot) {
          unavailableDatesSet.add(dateStr);
          if (checkDate.getDay() === 1) { // Monday debug
            console.log(`❌ [BATCH_AVAILABILITY] Monday ${dateStr} marked as unavailable - no complete slots found`);
          }
        }
      }

      console.log(`✅ [BATCH_AVAILABILITY] Found ${unavailableDatesSet.size} unavailable dates out of 90 checked`);
      console.log(`🗓️ [BATCH_AVAILABILITY] Sample unavailable dates:`, Array.from(unavailableDatesSet).slice(0, 10));
      console.log(`🗓️ [BATCH_AVAILABILITY] Available dates for staff:`, Array.from(availabilityByDate.keys()).slice(0, 10));
      
      return unavailableDatesSet;

    } catch (error) {
      console.error('❌ [BATCH_AVAILABILITY] Error in batch availability check:', error);
      return new Set();
    }
  }, [selectedStaffIds, serviceDuration]);

  const updateUnavailableDates = useCallback(async () => {
    if (selectedStaffIds.length === 0) {
      setUnavailableDates(new Set());
      return;
    }

    setIsLoading(true);
    const unavailableDatesSet = await checkBatchAvailability();
    setUnavailableDates(unavailableDatesSet);
    setIsLoading(false);
  }, [selectedStaffIds, checkBatchAvailability]);

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
    
    // Create date string using local timezone to match database format
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const isUnavailable = unavailableDates.has(dateStr);
    
    // Extra logging for Mondays
    if (date.getDay() === 1) {
      console.log(`🗓️ [DATE_CHECK] Monday check: ${dateStr}, isUnavailable: ${isUnavailable}, dayOfWeek: ${date.getDay()}`);
    }
    
    // Disable dates with no staff availability
    return isUnavailable;
  }, [unavailableDates]);

  const checkDateAvailability = useCallback(async (date: Date): Promise<boolean> => {
    if (selectedStaffIds.length === 0) return true;

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Use the pre-computed unavailable dates for faster lookup
    return !unavailableDates.has(dateStr);
  }, [selectedStaffIds, unavailableDates]);

  return {
    isDateDisabled,
    isLoading,
    checkDateAvailability
  };
};
