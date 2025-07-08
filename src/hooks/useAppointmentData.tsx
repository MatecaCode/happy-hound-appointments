
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  generateClientTimeSlots, 
  isClientSlotAvailable,
  formatTimeSlot,
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
    staffIds: string[],
    setIsLoading: (loading: boolean) => void,
    selectedService: Service | null
  ) => {
    // Prevent unnecessary fetches
    if (!selectedService || !date || !staffIds || staffIds.length === 0) {
      console.log('🚨 [FETCH_TIME_SLOTS] Missing required parameters - skipping fetch');
      setTimeSlots([]);
      return;
    }

    // CRITICAL: Deduplicate staff IDs at the very start
    const uniqueStaffIds = [...new Set(staffIds)];
    
    console.log('🔍 [FETCH_TIME_SLOTS] Starting multi-staff fetch with DEDUPLICATION...', {
      originalStaffIds: staffIds,
      uniqueStaffIds,
      deduplicationApplied: staffIds.length !== uniqueStaffIds.length
    });
    
    console.log('🎯 [FETCH_TIME_SLOTS] FINAL staff IDs for slot validation:', uniqueStaffIds);
    
    const dateForQuery = format(date, 'yyyy-MM-dd');
    const serviceDuration = selectedService.default_duration || 60;
    
    console.log('📋 [FETCH_TIME_SLOTS] Parameters:', {
      date: dateForQuery,
      originalStaffIds: staffIds,
      uniqueStaffIds,
      uniqueStaffCount: uniqueStaffIds.length,
      serviceDuration
    });

    setIsLoading(true);

    try {
      // Fetch 10-minute availability for ALL UNIQUE selected staff on this date
      const { data: availabilityData, error } = await supabase
        .from('staff_availability')
        .select('staff_profile_id, time_slot, available')
        .in('staff_profile_id', uniqueStaffIds)
        .eq('date', dateForQuery);

      if (error) {
        console.error('❌ [FETCH_TIME_SLOTS] Error fetching staff availability:', error);
        toast.error('Erro ao buscar horários disponíveis');
        setTimeSlots([]);
        return;
      }

      console.log(`📊 [FETCH_TIME_SLOTS] Raw availability data: ${availabilityData?.length || 0} records for ${uniqueStaffIds.length} UNIQUE staff`);
      
      // 🔍 NEW: Log the COMPLETE fetched availability data structure
      console.log('📋 [FETCH_TIME_SLOTS] COMPLETE BACKEND DATA:', {
        totalRecords: availabilityData?.length || 0,
        sampleRecords: availabilityData?.slice(0, 10),
        uniqueStaffIdsInData: [...new Set(availabilityData?.map(r => r.staff_profile_id) || [])],
        uniqueTimeSlotsInData: [...new Set(availabilityData?.map(r => r.time_slot) || [])].sort(),
        availableCount: availabilityData?.filter(r => r.available).length || 0,
        unavailableCount: availabilityData?.filter(r => !r.available).length || 0
      });

      if (!availabilityData || availabilityData.length === 0) {
        console.log('⚠️ [FETCH_TIME_SLOTS] NO AVAILABILITY DATA FOUND!');
        setTimeSlots([]);
        setIsLoading(false);
        return;
      }

      // Group availability by staff for easier processing
      const availabilityByStaff = new Map<string, Array<{ time_slot: string; available: boolean }>>();
      
      availabilityData.forEach(record => {
        if (!availabilityByStaff.has(record.staff_profile_id)) {
          availabilityByStaff.set(record.staff_profile_id, []);
        }
        availabilityByStaff.get(record.staff_profile_id)!.push({
          time_slot: record.time_slot,
          available: record.available
        });
      });

      console.log('🗂️ [FETCH_TIME_SLOTS] Availability grouped by UNIQUE staff:', {
        totalUniqueStaff: availabilityByStaff.size,
        expectedUniqueStaff: uniqueStaffIds.length,
        uniqueStaffWithData: Array.from(availabilityByStaff.keys())
      });

      // Generate 30-minute client slots and check multi-staff availability
      console.log('🔄 [FETCH_TIME_SLOTS] Generating 30-minute client slots...');
      const clientSlots = generateClientTimeSlots();
      console.log('📋 [FETCH_TIME_SLOTS] Generated client slots:', clientSlots);
      
      const availableSlots: TimeSlot[] = [];

      for (const clientSlot of clientSlots) {
        console.log(`\n🔍 [FETCH_TIME_SLOTS] ===== CHECKING CLIENT SLOT: ${clientSlot} =====`);
        
        // Check if ALL UNIQUE selected staff are available for this client slot
        let allUniqueStaffAvailable = true;
        const staffAvailabilityResults: Record<string, boolean> = {};
        
        for (const staffId of uniqueStaffIds) {
          const staffAvailability = availabilityByStaff.get(staffId) || [];
          
          console.log(`🔍 [FETCH_TIME_SLOTS] Checking staff ${staffId} for slot ${clientSlot}`);
          
          const isStaffAvailable = isClientSlotAvailable(
            clientSlot, 
            serviceDuration, 
            staffAvailability
          );
          
          staffAvailabilityResults[staffId] = isStaffAvailable;
          
          console.log(`📊 [FETCH_TIME_SLOTS] Staff ${staffId} available for ${clientSlot}: ${isStaffAvailable}`);
          
          if (!isStaffAvailable) {
            allUniqueStaffAvailable = false;
            console.log(`❌ [FETCH_TIME_SLOTS] Staff ${staffId} NOT available for ${clientSlot}`);
          } else {
            console.log(`✅ [FETCH_TIME_SLOTS] Staff ${staffId} IS available for ${clientSlot}`);
          }
        }

        console.log(`📊 [FETCH_TIME_SLOTS] Slot ${clientSlot} UNIQUE staff availability:`, {
          allUniqueStaffAvailable,
          uniqueStaffResults: staffAvailabilityResults
        });

        const slotObject = {
          id: clientSlot,
          time: formatTimeSlot(clientSlot),
          available: allUniqueStaffAvailable
        };

        availableSlots.push(slotObject);
        
        if (allUniqueStaffAvailable) {
          console.log(`✅ [FETCH_TIME_SLOTS] Available slot: ${clientSlot} (all ${uniqueStaffIds.length} UNIQUE staff available)`);
        } else {
          console.log(`❌ [FETCH_TIME_SLOTS] Unavailable slot: ${clientSlot} (some UNIQUE staff unavailable)`);
        }
      }

      console.log(`\n📊 [FETCH_TIME_SLOTS] ===== SLOT AGGREGATION COMPLETE =====`);
      console.log(`📊 [FETCH_TIME_SLOTS] Final Results for ${uniqueStaffIds.length} UNIQUE staff:`);
      console.log(`   Total slots generated: ${availableSlots.length}`);
      console.log(`   Available slots: ${availableSlots.filter(s => s.available).length}`);
      
      const availableSlotTimes = availableSlots.filter(s => s.available).map(s => s.time);
      console.log(`   Available times:`, availableSlotTimes);
      
      // 🚨 CRITICAL: Log the EXACT array before React state update
      console.log(`🚨 [FETCH_TIME_SLOTS] CRITICAL: availableSlots array BEFORE setTimeSlots:`, {
        arrayLength: availableSlots.length,
        availableCount: availableSlots.filter(s => s.available).length,
        fullArray: availableSlots,
        availableSlotsOnly: availableSlots.filter(s => s.available),
        sampleSlot: availableSlots[0],
        typeof: typeof availableSlots,
        isArray: Array.isArray(availableSlots)
      });

      // 🚨 CRITICAL: Call setTimeSlots and log immediately after
      console.log(`🎯 [FETCH_TIME_SLOTS] Calling setTimeSlots with ${availableSlots.length} slots...`);
      setTimeSlots(availableSlots);
      
      // 🚨 CRITICAL: Log immediately after setTimeSlots call
      console.log(`✅ [FETCH_TIME_SLOTS] setTimeSlots called successfully with:`, {
        inputArray: availableSlots,
        inputLength: availableSlots.length,
        availableInInput: availableSlots.filter(s => s.available).length
      });

    } catch (error) {
      console.error('❌ [FETCH_TIME_SLOTS] Unexpected error:', error);
      toast.error('Erro inesperado ao buscar horários');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
