
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz';
import { 
  generateClientTimeSlots, 
  isClientSlotAvailable,
  formatTimeSlot,
  createAvailabilitySummaryTable,
  TIME_SLOT_CONFIG
} from '@/utils/timeSlotHelpers';

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface Service {
  id: string;
  name: string;
  service_type: string;
  base_price?: number;
  default_duration?: number;
  requires_grooming?: boolean;
  requires_vet?: boolean;
  requires_bath?: boolean;
  active?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  bio?: string;
  can_bathe?: boolean;
  can_groom?: boolean;
  can_vet?: boolean;
  photo_url?: string;
  hourly_rate?: number;
}

export interface Pet {
  id: string;
  name: string;
  breed?: string;
  breed_id?: string;
  age?: string;
  size?: string;
  weight?: number;
  gender?: string;
  notes?: string;
}

export interface NextAvailable {
  date: string;
  time: string;
  staff_name?: string;
}

export const useAppointmentData = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [nextAvailable, setNextAvailable] = useState<NextAvailable | null>(null);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [groomers, setGroomers] = useState<Provider[]>([]);

  const fetchServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true);

      if (error) {
        console.error('Error fetching services:', error);
        toast.error('Erro ao buscar serviços');
        return;
      }

      setServices(data || []);
    } catch (error) {
      console.error('Unexpected error fetching services:', error);
      toast.error('Erro inesperado ao buscar serviços');
    }
  }, []);

  const fetchUserPets = useCallback(async (userId: string) => {
    try {
      // First get the client_id from the user_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (clientError || !clientData) {
        console.error('Error fetching client data:', clientError);
        toast.error('Erro ao buscar dados do cliente');
        return;
      }

      // Then fetch pets using the client_id
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('client_id', clientData.id);

      if (error) {
        console.error('Error fetching user pets:', error);
        toast.error('Erro ao buscar pets do usuário');
        return;
      }

      setUserPets(data || []);
    } catch (error) {
      console.error('Unexpected error fetching user pets:', error);
      toast.error('Erro inesperado ao buscar pets do usuário');
    }
  }, []);

  const fetchAvailableProviders = useCallback(async (serviceType: string) => {
    try {
      let query = supabase
        .from('staff_profiles')
        .select('*')
        .eq('active', true);

      // Filter based on service type capabilities
      if (serviceType === 'grooming') {
        query = query.eq('can_groom', true);
      } else if (serviceType === 'veterinary') {
        query = query.eq('can_vet', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching available providers:', error);
        toast.error('Erro ao buscar profissionais disponíveis');
        return;
      }

      // Transform staff_profiles data to match Provider interface
      const transformedData = data?.map(staff => ({
        id: staff.id,
        name: staff.name,
        bio: staff.bio,
        can_bathe: staff.can_bathe,
        can_groom: staff.can_groom,
        can_vet: staff.can_vet,
        photo_url: staff.photo_url,
        hourly_rate: staff.hourly_rate,
      })) || [];

      setGroomers(transformedData);
    } catch (error) {
      console.error('Unexpected error fetching available providers:', error);
      toast.error('Erro inesperado ao buscar profissionais');
    }
  }, []);

  const fetchTimeSlots = useCallback(async (
    date: Date,
    staffId: string | null,
    setIsLoading: (loading: boolean) => void,
    selectedService: Service | null
  ) => {
    if (!selectedService || !staffId) {
      console.log('⚠️ [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Missing required parameters');
      setTimeSlots([]);
      return;
    }

    console.log('🕐 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] ==========================================');
    console.log('🕐 [FETCH_TIME_SLOTS] Starting with timezone-aware debugging...');
    
    // Log the input date in multiple formats
    const inputDateUTC = format(date, 'yyyy-MM-dd HH:mm:ss');
    const inputDateSP = formatTz(date, 'yyyy-MM-dd HH:mm:ss', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
    const dateForQuery = format(date, 'yyyy-MM-dd');
    
    console.log('🕐 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Date analysis:');
    console.log(`  Input date object: ${date.toISOString()}`);
    console.log(`  UTC format: ${inputDateUTC}`);
    console.log(`  São Paulo format: ${inputDateSP}`);
    console.log(`  Query format: ${dateForQuery}`);
    
    console.log('🕐 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Parameters:', {
      date: dateForQuery,
      staffId,
      serviceDuration: selectedService.default_duration || 60,
      serviceType: selectedService.service_type,
      serviceName: selectedService.name
    });

    setIsLoading(true);

    try {
      const serviceDuration = selectedService.default_duration || 60;

      console.log('🔍 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Fetching staff availability...');
      console.log('🔍 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] SQL Query will be:');
      console.log(`  SELECT time_slot, available FROM staff_availability`);
      console.log(`  WHERE staff_profile_id = '${staffId}' AND date = '${dateForQuery}'`);
      
      // Fetch all 10-minute granular availability for the staff on this date
      const { data: availabilityData, error } = await supabase
        .from('staff_availability')
        .select('time_slot, available')
        .eq('staff_profile_id', staffId)
        .eq('date', dateForQuery);

      if (error) {
        console.error('❌ [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Error fetching staff availability:', error);
        toast.error('Erro ao buscar horários disponíveis');
        setTimeSlots([]);
        return;
      }

      console.log(`📊 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Raw availability data received:`, {
        recordCount: availabilityData?.length || 0,
        dateRequested: dateForQuery,
        staffId: staffId,
        timezone: TIME_SLOT_CONFIG.TIMEZONE
      });

      // Log timezone info for each availability record
      if (availabilityData && availabilityData.length > 0) {
        console.log('📋 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Raw availability records with timezone analysis:');
        availabilityData.forEach((record, index) => {
          try {
            const timeSlot = record.time_slot;
            const dateTime = new Date(`2024-01-01T${timeSlot}`);
            const utcTime = format(dateTime, 'HH:mm:ss');
            const spTime = formatTz(dateTime, 'HH:mm:ss', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
            
            console.log(`  ${index + 1}: ${timeSlot} = ${record.available} (UTC: ${utcTime}, SP: ${spTime})`);
          } catch (error) {
            console.log(`  ${index + 1}: ${record.time_slot} = ${record.available} (TIMEZONE_ERROR: ${error})`);
          }
        });
      } else {
        console.log('⚠️ [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] NO AVAILABILITY DATA FOUND!');
        console.log('⚠️ [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] This could be why no slots are showing up.');
        console.log('⚠️ [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Possible causes:');
        console.log('   - Staff availability not generated for this date');
        console.log('   - Incorrect staff_profile_id');
        console.log('   - Date format mismatch');
        console.log('   - Timezone conversion issue');
        console.log('   - Database query issue');
      }

      // Create availability summary table with timezone awareness
      createAvailabilitySummaryTable(
        availabilityData || [], 
        dateForQuery, 
        staffId, 
        serviceDuration
      );

      // Generate 30-minute client slots and check availability using 10-minute granular logic
      console.log('🔄 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Generating client-facing 30-minute slots...');
      const clientSlots = generateClientTimeSlots();
      console.log(`📝 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Generated ${clientSlots.length} client slots in ${TIME_SLOT_CONFIG.TIMEZONE}:`, clientSlots);

      const availableSlots: TimeSlot[] = [];

      console.log('🔍 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Checking each client slot with timezone awareness...');
      for (const clientSlot of clientSlots) {
        console.log(`\n--- [TIMEZONE_DEBUG] Checking client slot: ${clientSlot} in ${TIME_SLOT_CONFIG.TIMEZONE} ---`);
        
        const isAvailable = isClientSlotAvailable(
          clientSlot, 
          serviceDuration, 
          availabilityData || []
        );

        const slotObject = {
          id: clientSlot,
          time: formatTimeSlot(clientSlot),
          available: isAvailable
        };

        availableSlots.push(slotObject);

        console.log(`📊 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Created slot object:`, slotObject);
        console.log(`Result for ${clientSlot}: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'} in ${TIME_SLOT_CONFIG.TIMEZONE}`);
      }

      console.log('📊 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Final Results Summary:');
      console.log(`   Timezone: ${TIME_SLOT_CONFIG.TIMEZONE}`);
      console.log(`   Date queried: ${dateForQuery}`);
      console.log(`   Total client slots generated: ${availableSlots.length}`);
      console.log(`   Available slots: ${availableSlots.filter(s => s.available).length}`);
      console.log(`   Unavailable slots: ${availableSlots.filter(s => !s.available).length}`);
      
      const availableSlotTimes = availableSlots.filter(s => s.available).map(s => s.time);
      console.log(`   Available slot times in ${TIME_SLOT_CONFIG.TIMEZONE}:`, availableSlotTimes);

      // 🚨 PIPELINE DEBUGGING WITH TIMEZONE INFO 🚨
      console.log('🔄 [PIPELINE_DEBUG] [TIMEZONE_DEBUG] ==========================================');
      console.log('🔄 [PIPELINE_DEBUG] COMPLETE availableSlots array before setTimeSlots:');
      console.log(`🔄 [PIPELINE_DEBUG] Timezone: ${TIME_SLOT_CONFIG.TIMEZONE}`);
      console.log(JSON.stringify(availableSlots, null, 2));
      
      console.log('🔄 [PIPELINE_DEBUG] [TIMEZONE_DEBUG] Available slots structure analysis:');
      availableSlots.forEach((slot, index) => {
        try {
          const dateTime = new Date(`2024-01-01T${slot.id}`);
          const utcTime = format(dateTime, 'HH:mm:ss');
          const spTime = formatTz(dateTime, 'HH:mm:ss', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
          
          console.log(`  Slot ${index}: id="${slot.id}", time="${slot.time}", available=${slot.available} (UTC: ${utcTime}, SP: ${spTime})`);
        } catch (error) {
          console.log(`  Slot ${index}: id="${slot.id}", time="${slot.time}", available=${slot.available} (TIMEZONE_ERROR: ${error})`);
        }
      });

      console.log(`🔄 [PIPELINE_DEBUG] [TIMEZONE_DEBUG] Calling setTimeSlots with: ${availableSlots.length} slots for date ${dateForQuery} in ${TIME_SLOT_CONFIG.TIMEZONE}`);

      if (availableSlotTimes.length === 0) {
        console.log('❌ [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] NO AVAILABLE SLOTS FOUND!');
        console.log('❌ [FETCH_TIME_SLOTS] This is the root cause of the "Nenhum horário disponível" message.');
        console.log('❌ [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Possible timezone-related causes:');
        console.log('   - Date/time conversion between UTC and São Paulo timezone');
        console.log('   - Database storing times in different timezone than expected');
        console.log('   - Client-side date parsing defaulting to different timezone');
        console.log('❌ [FETCH_TIME_SLOTS] Review the detailed timezone logs above to identify the issue.');
      } else {
        console.log(`✅ [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] SUCCESS! Found ${availableSlotTimes.length} available slots in ${TIME_SLOT_CONFIG.TIMEZONE}`);
      }

      setTimeSlots(availableSlots);
      console.log(`🔄 [PIPELINE_DEBUG] [TIMEZONE_DEBUG] setTimeSlots called successfully for ${dateForQuery} in ${TIME_SLOT_CONFIG.TIMEZONE}`);
      console.log('🕐 [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] ==========================================');

    } catch (error) {
      console.error('❌ [FETCH_TIME_SLOTS] [TIMEZONE_DEBUG] Unexpected error:', error);
      toast.error('Erro inesperado ao buscar horários');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 🚨 Debug the timeSlots state whenever it changes with timezone info
  useEffect(() => {
    console.log('🔄 [STATE_DEBUG] [TIMEZONE_DEBUG] ==========================================');
    console.log(`🔄 [STATE_DEBUG] timeSlots state changed to: ${timeSlots.length} slots in ${TIME_SLOT_CONFIG.TIMEZONE}`);
    console.log('🔄 [STATE_DEBUG] [TIMEZONE_DEBUG] timeSlots content:');
    timeSlots.forEach((slot, index) => {
      try {
        const dateTime = new Date(`2024-01-01T${slot.id}`);
        const utcTime = format(dateTime, 'HH:mm:ss');
        const spTime = formatTz(dateTime, 'HH:mm:ss', { timeZone: TIME_SLOT_CONFIG.TIMEZONE });
        
        console.log(`  State Slot ${index}: id="${slot.id}", time="${slot.time}", available=${slot.available} (UTC: ${utcTime}, SP: ${spTime})`);
      } catch (error) {
        console.log(`  State Slot ${index}: id="${slot.id}", time="${slot.time}", available=${slot.available} (TIMEZONE_ERROR: ${error})`);
      }
    });
    console.log(`🔄 [STATE_DEBUG] [TIMEZONE_DEBUG] Available slots in state: ${timeSlots.filter(s => s.available).length} in ${TIME_SLOT_CONFIG.TIMEZONE}`);
    console.log('🔄 [STATE_DEBUG] [TIMEZONE_DEBUG] ==========================================');
  }, [timeSlots]);

  return {
    timeSlots,
    nextAvailable,
    userPets,
    services,
    groomers,
    fetchAvailableProviders,
    fetchServices,
    fetchUserPets,
    fetchTimeSlots,
  };
};
