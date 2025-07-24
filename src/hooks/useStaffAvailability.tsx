
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

      console.log(`🎯 [BATCH_AVAILABILITY] Query executed with params:`, {
        staffIds: uniqueStaffIds,
        startDate: startDateStr,
        endDate: endDateStr,
        resultCount: availabilityData?.length || 0
      });

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
          console.log(`⏭️ [BATCH_AVAILABILITY] Skipping ${dateStr} - Sunday`);
          unavailableDatesSet.add(dateStr);
          continue;
        }

        const dateAvailability = availabilityByDate.get(dateStr);
        if (!dateAvailability) {
          console.log(`❌ [BATCH_AVAILABILITY] No availability data for ${dateStr} - marking unavailable`);
          unavailableDatesSet.add(dateStr);
          continue;
        }

        // SIMPLIFIED LOGIC: Check if ANY staff has ANY availability for this date
        let hasAnyAvailability = false;
        let totalAvailableSlots = 0;

        console.log(`🔍 [BATCH_AVAILABILITY] Checking ${dateStr} - has ${dateAvailability.size} staff with data`);

        // Count total available slots for all selected staff on this date
        for (const staffId of uniqueStaffIds) {
          const staffAvailability = dateAvailability.get(staffId) || [];
          const availableCount = staffAvailability.filter(slot => slot.available).length;
          totalAvailableSlots += availableCount;
          
          if (availableCount > 0) {
            hasAnyAvailability = true;
          }
          
          console.log(`👤 [BATCH_AVAILABILITY] Staff ${staffId} on ${dateStr}: ${availableCount} available slots`);
        }

        console.log(`📊 [BATCH_AVAILABILITY] ${dateStr} total available slots: ${totalAvailableSlots}`);

        if (!hasAnyAvailability || totalAvailableSlots === 0) {
          console.log(`❌ [BATCH_AVAILABILITY] ${dateStr} marked unavailable - no available slots found`);
          unavailableDatesSet.add(dateStr);
        } else {
          console.log(`✅ [BATCH_AVAILABILITY] ${dateStr} available - has ${totalAvailableSlots} total available slots`);
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
