
import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  generateClientTimeSlots, 
  isClientSlotAvailable,
  TIME_SLOT_CONFIG
} from '@/utils/timeSlotHelpers';

interface UseStaffAvailabilityParams {
  selectedStaffIds: string[];
  serviceDuration: number;
}

export const useStaffAvailability = ({ selectedStaffIds, serviceDuration }: UseStaffAvailabilityParams) => {
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the unique staff IDs to prevent infinite loops
  const uniqueStaffIds = useMemo(() => {
    return [...new Set(selectedStaffIds)];
  }, [selectedStaffIds]);

  // Memoize the staff IDs as a string for stable dependency comparison
  const staffIdsKey = useMemo(() => {
    return uniqueStaffIds.sort().join(',');
  }, [uniqueStaffIds]);

  const checkBatchAvailability = useCallback(async (): Promise<Set<string>> => {
    if (uniqueStaffIds.length === 0) return new Set();

    // Basic logging for availability check
    if (uniqueStaffIds.length !== selectedStaffIds.length) {
      console.log(`[AVAILABILITY] Deduplicated ${selectedStaffIds.length} staff to ${uniqueStaffIds.length} unique IDs`);
    }
    
    try {
      // Check next 1 year to ensure full availability coverage
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 360);
      
      const startDateStr = format(today, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetching availability data for date range

      // Fetch all 10-minute availability data for the date range and UNIQUE selected staff
      // Test: Handle NULL values in available column
      const { data: availabilityData, error } = await supabase
  .from('staff_availability')
  .select('staff_profile_id, date, time_slot, available')
  .in('staff_profile_id', uniqueStaffIds)
  .gte('date', startDateStr)
  .lte('date', endDateStr)
  .eq('available', true)
  .range(0, 99999);
        // Data fetched successfully


      // Query executed successfully

      if (error) {
        console.error('❌ [BATCH_AVAILABILITY] Error fetching availability:', error);
        return new Set();
      }

      // Processing availability data

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

      const availableDatesSet = new Set<string>();

      // Check each date in the 1-year range
      const totalDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 0; i < totalDays; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        
        // Skip Sundays (day 0) - they are never available
        if (checkDate.getDay() === 0) {
          continue;
        }

        const dateAvailability = availabilityByDate.get(dateStr);
        if (!dateAvailability) {
          continue;
        }

        // Check if ANY staff has ANY availability for this date
        let hasAnyAvailability = false;
        let totalAvailableSlots = 0;

        // Count total available slots for all selected staff on this date
        for (const staffId of uniqueStaffIds) {
          const staffAvailability = dateAvailability.get(staffId) || [];
          // Treat NULL as available (true)
          const availableCount = staffAvailability.filter(slot => slot.available === true || slot.available === null).length;
          totalAvailableSlots += availableCount;
          
          if (availableCount > 0) {
            hasAnyAvailability = true;
          }
        }

        if (hasAnyAvailability && totalAvailableSlots > 0) {
          availableDatesSet.add(dateStr);
        }
      }

      // Available dates processed
      return availableDatesSet;

    } catch (error) {
      console.error('❌ [BATCH_AVAILABILITY] Error in batch availability check:', error);
      return new Set();
    }
  }, [uniqueStaffIds, serviceDuration]);

  const updateAvailableDates = useCallback(async () => {
    if (uniqueStaffIds.length === 0) {
      setAvailableDates(new Set());
      return;
    }

    setIsLoading(true);
    const availableDatesSet = await checkBatchAvailability();
    setAvailableDates(availableDatesSet);
    setIsLoading(false);
  }, [uniqueStaffIds, checkBatchAvailability]);

  // Use the memoized staffIdsKey to prevent infinite loops
  useEffect(() => {
    // Guard against empty staff IDs or zero service duration
    if (staffIdsKey === '' || serviceDuration <= 0) {
      return;
    }
    
    updateAvailableDates();
  }, [staffIdsKey, serviceDuration, updateAvailableDates]);

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
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const isAvailable = availableDates.has(dateStr);
    return !isAvailable;
  }, [availableDates]);

  const checkDateAvailability = useCallback(async (date: Date): Promise<boolean> => {
    if (uniqueStaffIds.length === 0) return true;

    const dateStr = format(date, 'yyyy-MM-dd');
    return availableDates.has(dateStr);
  }, [uniqueStaffIds, availableDates]);

  return {
  isDateDisabled,
  isLoading,
  checkDateAvailability,
  availableDates
  };
};
