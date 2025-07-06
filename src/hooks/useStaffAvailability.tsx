
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  generateClientTimeSlots, 
  getRequiredBackendSlots, 
  isClientSlotAvailable 
} from '@/utils/timeSlotHelpers';

interface UseStaffAvailabilityParams {
  selectedStaffIds: string[];
  serviceDuration: number;
}

export const useStaffAvailability = ({ selectedStaffIds, serviceDuration }: UseStaffAvailabilityParams) => {
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const checkBatchAvailability = useCallback(async (): Promise<Set<string>> => {
    if (selectedStaffIds.length === 0) return new Set();

    console.log(`🔄 [BATCH_AVAILABILITY] Checking availability for ${selectedStaffIds.length} staff members with 10min granular logic`);
    
    try {
      // Check next 90 days in batches
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 90);
      
      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch all 10-minute granular availability data for the date range and selected staff
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

      console.log(`📊 [BATCH_AVAILABILITY] Fetched ${availabilityData?.length || 0} 10-min availability records`);

      // Group availability by date and staff
      const availabilityByDate = new Map<string, Map<string, Array<{ time_slot: string; available: boolean }>>>();
      
      availabilityData?.forEach(record => {
        if (!availabilityByDate.has(record.date)) {
          availabilityByDate.set(record.date, new Map());
        }
        
        const dateAvailability = availabilityByDate.get(record.date)!;
        if (!dateAvailability.has(record.staff_profile_id)) {
          dateAvailability.set(record.staff_profile_id, []);
        }
        
        dateAvailability.get(record.staff_profile_id)!.push({
          time_slot: record.time_slot,
          available: record.available
        });
      });

      const unavailableDatesSet = new Set<string>();

      // Check each date in the 90-day range
      for (let i = 0; i < 90; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        const year = checkDate.getFullYear();
        const month = (checkDate.getMonth() + 1).toString().padStart(2, '0');
        const day = checkDate.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Skip Sundays (day 0) - they should be unavailable
        if (checkDate.getDay() === 0) {
          unavailableDatesSet.add(dateStr);
          continue;
        }

        const dateAvailability = availabilityByDate.get(dateStr);
        if (!dateAvailability) {
          unavailableDatesSet.add(dateStr);
          continue;
        }

        // Check if any 30-minute client slot is available using 10-minute granular logic
        let hasAvailableClientSlot = false;
        const clientSlots = generateClientTimeSlots();

        for (const clientSlot of clientSlots) {
          // Check if ALL selected staff have availability for this client slot
          let allStaffAvailable = true;
          
          for (const staffId of selectedStaffIds) {
            const staffAvailability = dateAvailability.get(staffId) || [];
            
            if (!isClientSlotAvailable(clientSlot, serviceDuration, staffAvailability)) {
              allStaffAvailable = false;
              break;
            }
          }

          if (allStaffAvailable) {
            hasAvailableClientSlot = true;
            break;
          }
        }

        if (!hasAvailableClientSlot) {
          unavailableDatesSet.add(dateStr);
        }
      }

      console.log(`✅ [BATCH_AVAILABILITY] Found ${unavailableDatesSet.size} unavailable dates out of 90 checked using 10min granular logic`);
      
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
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const isUnavailable = unavailableDates.has(dateStr);
    
    return isUnavailable;
  }, [unavailableDates]);

  const checkDateAvailability = useCallback(async (date: Date): Promise<boolean> => {
    if (selectedStaffIds.length === 0) return true;

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return !unavailableDates.has(dateStr);
  }, [selectedStaffIds, unavailableDates]);

  return {
    isDateDisabled,
    isLoading,
    checkDateAvailability
  };
};
