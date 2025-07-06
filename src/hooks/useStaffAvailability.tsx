import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, format as formatTz } from 'date-fns-tz';
import { 
  generateClientTimeSlots, 
  getRequiredBackendSlots, 
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

  const checkBatchAvailability = useCallback(async (): Promise<Set<string>> => {
    if (selectedStaffIds.length === 0) return new Set();

    console.log(`🔄 [BATCH_AVAILABILITY] [TIMEZONE_DEBUG] Checking availability for ${selectedStaffIds.length} staff members with 10min granular logic in ${TIME_SLOT_CONFIG.TIMEZONE}`);
    
    try {
      // Check next 90 days in batches
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 90);
      
      // Convert dates to proper timezone
      const todayUTC = format(today, 'yyyy-MM-dd');
      const todaySP = formatTz(utcToZonedTime(today, TIME_SLOT_CONFIG.TIMEZONE), 'yyyy-MM-dd', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
      const endDateUTC = format(endDate, 'yyyy-MM-dd');
      const endDateSP = formatTz(utcToZonedTime(endDate, TIME_SLOT_CONFIG.TIMEZONE), 'yyyy-MM-dd', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
      
      console.log(`🕐 [BATCH_AVAILABILITY] [TIMEZONE_DEBUG] Date range analysis:`);
      console.log(`  Today UTC: ${todayUTC}, SP: ${todaySP}`);
      console.log(`  End UTC: ${endDateUTC}, SP: ${endDateSP}`);
      console.log(`  Using for query: ${todaySP} to ${endDateSP}`);

      const startDateStr = todaySP;
      const endDateStr = endDateSP;

      console.log(`🔍 [BATCH_AVAILABILITY] [TIMEZONE_DEBUG] SQL Query:`)
      console.log(`  SELECT staff_profile_id, date, time_slot, available FROM staff_availability`);
      console.log(`  WHERE staff_profile_id IN (${selectedStaffIds.map(id => `'${id}'`).join(', ')})`);
      console.log(`  AND date >= '${startDateStr}' AND date <= '${endDateStr}' AND available = true`);

      // Fetch all 10-minute granular availability data for the date range and selected staff
      const { data: availabilityData, error } = await supabase
        .from('staff_availability')
        .select('staff_profile_id, date, time_slot, available')
        .in('staff_profile_id', selectedStaffIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .eq('available', true);

      if (error) {
        console.error('❌ [BATCH_AVAILABILITY] [TIMEZONE_DEBUG] Error fetching availability:', error);
        return new Set();
      }

      console.log(`📊 [BATCH_AVAILABILITY] [TIMEZONE_DEBUG] Fetched ${availabilityData?.length || 0} 10-min availability records in ${TIME_SLOT_CONFIG.TIMEZONE}`);

      // Log sample of availability data with timezone info
      if (availabilityData && availabilityData.length > 0) {
        console.log(`📋 [BATCH_AVAILABILITY] [TIMEZONE_DEBUG] Sample availability records (first 5):`);
        availabilityData.slice(0, 5).forEach((record, index) => {
          try {
            const dateTime = new Date(`${record.date}T${record.time_slot}`);
            const utcTime = format(dateTime, 'yyyy-MM-dd HH:mm:ss');
            const spTime = formatTz(dateTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
            
            console.log(`  ${index + 1}: ${record.date} ${record.time_slot} (UTC: ${utcTime}, SP: ${spTime}) - Staff: ${record.staff_profile_id}`);
          } catch (error) {
            console.log(`  ${index + 1}: ${record.date} ${record.time_slot} (TIMEZONE_ERROR: ${error}) - Staff: ${record.staff_profile_id}`);
          }
        });
      }

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

      // Check each date in the 90-day range with timezone awareness
      for (let i = 0; i < 90; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        // Use São Paulo timezone for date formatting
        const spDate = utcToZonedTime(checkDate, TIME_SLOT_CONFIG.TIMEZONE);
        const dateStr = formatTz(spDate, 'yyyy-MM-dd', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
        
        console.log(`🔍 [BATCH_AVAILABILITY] [TIMEZONE_DEBUG] Checking date ${dateStr} (day ${i}) in ${TIME_SLOT_CONFIG.TIMEZONE}`);
        
        // Skip Sundays (day 0) - they should be unavailable
        if (checkDate.getDay() === 0) {
          unavailableDatesSet.add(dateStr);
          console.log(`  ⏭️ Skipping Sunday: ${dateStr}`);
          continue;
        }

        const dateAvailability = availabilityByDate.get(dateStr);
        if (!dateAvailability) {
          unavailableDatesSet.add(dateStr);
          console.log(`  ❌ No availability data for: ${dateStr}`);
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
            console.log(`  ✅ Found available slot ${clientSlot} for ${dateStr} in ${TIME_SLOT_CONFIG.TIMEZONE}`);
            break;
          }
        }

        if (!hasAvailableClientSlot) {
          unavailableDatesSet.add(dateStr);
          console.log(`  ❌ No available slots for: ${dateStr} in ${TIME_SLOT_CONFIG.TIMEZONE}`);
        }
      }

      console.log(`✅ [BATCH_AVAILABILITY] [TIMEZONE_DEBUG] Found ${unavailableDatesSet.size} unavailable dates out of 90 checked using 10min granular logic in ${TIME_SLOT_CONFIG.TIMEZONE}`);
      console.log(`📋 [BATCH_AVAILABILITY] [TIMEZONE_DEBUG] Unavailable dates:`, Array.from(unavailableDatesSet));
      
      return unavailableDatesSet;

    } catch (error) {
      console.error('❌ [BATCH_AVAILABILITY] [TIMEZONE_DEBUG] Error in batch availability check:', error);
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
    
    // Convert date to São Paulo timezone for comparison
    const spDate = utcToZonedTime(date, TIME_SLOT_CONFIG.TIMEZONE);
    const dateStr = formatTz(spDate, 'yyyy-MM-dd', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
    
    const isUnavailable = unavailableDates.has(dateStr);
    
    console.log(`🔍 [DATE_DISABLED] [TIMEZONE_DEBUG] Checking date: ${dateStr} in ${TIME_SLOT_CONFIG.TIMEZONE} - Disabled: ${isUnavailable}`);
    
    return isUnavailable;
  }, [unavailableDates]);

  const checkDateAvailability = useCallback(async (date: Date): Promise<boolean> => {
    if (selectedStaffIds.length === 0) return true;

    const spDate = utcToZonedTime(date, TIME_SLOT_CONFIG.TIMEZONE);
    const dateStr = formatTz(spDate, 'yyyy-MM-dd', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
    
    const result = !unavailableDates.has(dateStr);
    console.log(`🔍 [CHECK_DATE_AVAILABILITY] [TIMEZONE_DEBUG] Date ${dateStr} in ${TIME_SLOT_CONFIG.TIMEZONE} - Available: ${result}`);
    
    return result;
  }, [selectedStaffIds, unavailableDates]);

  return {
    isDateDisabled,
    isLoading,
    checkDateAvailability
  };
};
