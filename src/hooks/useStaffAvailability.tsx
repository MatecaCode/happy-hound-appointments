
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
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
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

    console.log(`🔄 [BATCH_AVAILABILITY] Checking availability with DEDUPLICATION:`, {
      originalStaffIds: selectedStaffIds,
      uniqueStaffIds,
      deduplicationApplied: selectedStaffIds.length !== uniqueStaffIds.length
    });
    
    console.log('🎯 [BATCH_AVAILABILITY] FINAL staff IDs for batch validation:', uniqueStaffIds);
    
    try {
      // Check next 120 days to ensure full availability coverage
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 120);
      
      const startDateStr = format(today, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      console.log(`🔍 [BATCH_AVAILABILITY] Fetching availability from ${startDateStr} to ${endDateStr}`);

      // Fetch all 10-minute availability data for the date range and UNIQUE selected staff
      const { data: availabilityData, error } = await supabase
        .from('staff_availability')
        .select('staff_profile_id, date, time_slot, available')
        .in('staff_profile_id', uniqueStaffIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .eq('available', true);

      if (error) {
        console.error('❌ [BATCH_AVAILABILITY] Error fetching availability:', error);
        return new Set();
      }

      console.log(`📊 [BATCH_AVAILABILITY] Fetched ${availabilityData?.length || 0} available 10-min records for ${uniqueStaffIds.length} UNIQUE staff`);

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

      // Check each date in the 120-day range
      for (let i = 0; i < 120; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        
        // Skip Sundays (day 0)
        if (checkDate.getDay() === 0) {
          unavailableDatesSet.add(dateStr);
          continue;
        }

        const dateAvailability = availabilityByDate.get(dateStr);
        if (!dateAvailability) {
          unavailableDatesSet.add(dateStr);
          continue;
        }

        // Check if any 30-minute client slot is available for ALL UNIQUE selected staff
        let hasAvailableClientSlot = false;
        const clientSlots = generateClientTimeSlots();

        for (const clientSlot of clientSlots) {
          // Check if ALL UNIQUE selected staff have availability for this client slot
          let allUniqueStaffAvailable = true;
          
          for (const staffId of uniqueStaffIds) {
            const staffAvailability = dateAvailability.get(staffId) || [];
            
            if (!isClientSlotAvailable(clientSlot, serviceDuration, staffAvailability)) {
              allUniqueStaffAvailable = false;
              break;
            }
          }

          if (allUniqueStaffAvailable) {
            hasAvailableClientSlot = true;
            break;
          }
        }

        if (!hasAvailableClientSlot) {
          unavailableDatesSet.add(dateStr);
        }
      }

      console.log(`✅ [BATCH_AVAILABILITY] Found ${unavailableDatesSet.size} unavailable dates out of 120 checked for ${uniqueStaffIds.length} UNIQUE staff`);
      
      return unavailableDatesSet;

    } catch (error) {
      console.error('❌ [BATCH_AVAILABILITY] Error in batch availability check:', error);
      return new Set();
    }
  }, [uniqueStaffIds, serviceDuration]);

  const updateUnavailableDates = useCallback(async () => {
    if (uniqueStaffIds.length === 0) {
      setUnavailableDates(new Set());
      return;
    }

    setIsLoading(true);
    const unavailableDatesSet = await checkBatchAvailability();
    setUnavailableDates(unavailableDatesSet);
    setIsLoading(false);
  }, [uniqueStaffIds, checkBatchAvailability]);

  // Use the memoized staffIdsKey to prevent infinite loops
  useEffect(() => {
    // Guard against empty staff IDs or zero service duration
    if (staffIdsKey === '' || serviceDuration <= 0) {
      return;
    }
    
    updateUnavailableDates();
  }, [staffIdsKey, serviceDuration, updateUnavailableDates]);

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
    return unavailableDates.has(dateStr);
  }, [unavailableDates]);

  const checkDateAvailability = useCallback(async (date: Date): Promise<boolean> => {
    if (uniqueStaffIds.length === 0) return true;

    const dateStr = format(date, 'yyyy-MM-dd');
    return !unavailableDates.has(dateStr);
  }, [uniqueStaffIds, unavailableDates]);

  return {
    isDateDisabled,
    isLoading,
    checkDateAvailability
  };
};
