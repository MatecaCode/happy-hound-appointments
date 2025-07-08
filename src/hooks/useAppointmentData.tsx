
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
    console.log('\n🔥 [REAL_AVAILABILITY_FIX] ===== STARTING AVAILABILITY FETCH =====');
    console.log('🔥 [REAL_AVAILABILITY_FIX] Parameters:', {
      date: date?.toISOString(),
      staffIds,
      staffCount: staffIds?.length,
      selectedService: selectedService?.name,
      serviceDuration: selectedService?.default_duration || 60
    });

    // Prevent unnecessary fetches
    if (!selectedService || !date || !staffIds || staffIds.length === 0) {
      console.log('🔥 [REAL_AVAILABILITY_FIX] Missing required parameters - CLEARING SLOTS');
      setTimeSlots([]);
      return;
    }

    // CRITICAL: Deduplicate staff IDs at the very start
    const uniqueStaffIds = [...new Set(staffIds)];
    
    console.log('🔍 [REAL_AVAILABILITY_FIX] Using UNIQUE staff IDs:', uniqueStaffIds);
    
    const dateForQuery = format(date, 'yyyy-MM-dd');
    const serviceDuration = selectedService.default_duration || 60;

    setIsLoading(true);

    try {
      // STEP A: Fetch the REAL availability from Supabase - INCLUDING FALSE VALUES
      console.log('📋 [REAL_AVAILABILITY_FIX] STEP A: Fetching RAW availability from database...');
      
      const { data: availabilityData, error } = await supabase
        .from('staff_availability')
        .select('staff_profile_id, time_slot, available')
        .in('staff_profile_id', uniqueStaffIds)
        .eq('date', dateForQuery);

      if (error) {
        console.error('❌ [REAL_AVAILABILITY_FIX] Error fetching staff availability:', error);
        toast.error('Erro ao buscar horários disponíveis');
        setTimeSlots([]);
        return;
      }

      console.log('📊 [REAL_AVAILABILITY_FIX] RAW DATABASE RESPONSE:');
      console.log('   Total records:', availabilityData?.length || 0);
      console.log('   Raw data:', availabilityData);
      
      if (!availabilityData || availabilityData.length === 0) {
        console.log('⚠️ [REAL_AVAILABILITY_FIX] NO AVAILABILITY DATA FOUND!');
        setTimeSlots([]);
        setIsLoading(false);
        return;
      }

      // STEP B: Build the Combined Availability Map
      console.log('📋 [REAL_AVAILABILITY_FIX] STEP B: Building combined availability map...');
      
      // Group availability by time slot, then by staff
      const availabilityByTimeSlot = new Map<string, Map<string, boolean>>();
      
      availabilityData.forEach(record => {
        if (!availabilityByTimeSlot.has(record.time_slot)) {
          availabilityByTimeSlot.set(record.time_slot, new Map());
        }
        availabilityByTimeSlot.get(record.time_slot)!.set(record.staff_profile_id, record.available);
      });

      console.log('🗂️ [REAL_AVAILABILITY_FIX] Combined availability map by time slot:');
      for (const [timeSlot, staffMap] of availabilityByTimeSlot.entries()) {
        const staffAvailability = Object.fromEntries(staffMap);
        console.log(`   ${timeSlot}:`, staffAvailability);
      }

      // STEP C: Map to 30-Minute Slots for the UI
      console.log('📋 [REAL_AVAILABILITY_FIX] STEP C: Generating 30-minute client slots...');
      const clientSlots = generateClientTimeSlots();
      console.log('   Generated client slots:', clientSlots);
      
      const availableSlots: TimeSlot[] = [];

      for (const clientSlot of clientSlots) {
        console.log(`\n🔍 [REAL_AVAILABILITY_FIX] ===== CHECKING CLIENT SLOT: ${clientSlot} =====`);
        
        // Get all 10-minute slots needed for this service duration
        const requiredSlots = getRequiredBackendSlots(clientSlot, serviceDuration);
        console.log(`📋 [REAL_AVAILABILITY_FIX] Required 10-min slots for ${clientSlot}:`, requiredSlots);
        
        // Check if ALL required slots are available for ALL selected staff
        let allStaffAvailableForAllSlots = true;
        const slotAnalysis: Record<string, Record<string, boolean | 'MISSING'>> = {};
        
        for (const requiredSlot of requiredSlots) {
          slotAnalysis[requiredSlot] = {};
          
          const staffAvailabilityForSlot = availabilityByTimeSlot.get(requiredSlot);
          
          for (const staffId of uniqueStaffIds) {
            const isStaffAvailable = staffAvailabilityForSlot?.get(staffId);
            
            if (isStaffAvailable === undefined) {
              // Slot is missing for this staff - treat as unavailable
              slotAnalysis[requiredSlot][staffId] = 'MISSING';
              allStaffAvailableForAllSlots = false;
              console.log(`❌ [REAL_AVAILABILITY_FIX] Staff ${staffId} MISSING data for slot ${requiredSlot}`);
            } else if (isStaffAvailable === false) {
              // Slot is explicitly unavailable
              slotAnalysis[requiredSlot][staffId] = false;
              allStaffAvailableForAllSlots = false;
              console.log(`❌ [REAL_AVAILABILITY_FIX] Staff ${staffId} UNAVAILABLE for slot ${requiredSlot}`);
            } else {
              // Slot is available
              slotAnalysis[requiredSlot][staffId] = true;
              console.log(`✅ [REAL_AVAILABILITY_FIX] Staff ${staffId} AVAILABLE for slot ${requiredSlot}`);
            }
          }
        }

        console.log(`📊 [REAL_AVAILABILITY_FIX] Complete slot analysis for ${clientSlot}:`, slotAnalysis);
        console.log(`📊 [REAL_AVAILABILITY_FIX] All staff available for all required slots: ${allStaffAvailableForAllSlots}`);

        const slotObject = {
          id: clientSlot,
          time: formatTimeSlot(clientSlot),
          available: allStaffAvailableForAllSlots
        };

        availableSlots.push(slotObject);
      }

      console.log(`\n📊 [REAL_AVAILABILITY_FIX] ===== FINAL SLOT AGGREGATION =====`);
      console.log(`📊 [REAL_AVAILABILITY_FIX] Total client slots generated: ${availableSlots.length}`);
      console.log(`📊 [REAL_AVAILABILITY_FIX] Available slots: ${availableSlots.filter(s => s.available).length}`);
      console.log(`📊 [REAL_AVAILABILITY_FIX] Unavailable slots: ${availableSlots.filter(s => !s.available).length}`);
      
      const availableSlotTimes = availableSlots.filter(s => s.available).map(s => s.time);
      console.log(`📊 [REAL_AVAILABILITY_FIX] Available times:`, availableSlotTimes);
      
      // STEP D: Log the final array being sent to UI
      console.log(`🔥 [REAL_AVAILABILITY_FIX] STEP D: Final array BEFORE setTimeSlots:`, {
        arrayLength: availableSlots.length,
        availableCount: availableSlots.filter(s => s.available).length,
        fullArray: availableSlots,
        availableSlotsOnly: availableSlots.filter(s => s.available),
        timestamp: new Date().toISOString()
      });

      // Set the time slots
      setTimeSlots(availableSlots);
      
      console.log(`🔥 [REAL_AVAILABILITY_FIX] setTimeSlots called with ${availableSlots.length} slots`);

    } catch (error) {
      console.error('❌ [REAL_AVAILABILITY_FIX] Unexpected error:', error);
      toast.error('Erro inesperado ao buscar horários');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to get required backend slots (copied from timeSlotHelpers but with logging)
  const getRequiredBackendSlots = (startTime: string, durationMinutes: number): string[] => {
    const slots: string[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    
    // Generate all 10-minute slots for the duration
    for (let offset = 0; offset < durationMinutes; offset += 10) {
      const slotTotalMinutes = startTotalMinutes + offset;
      const slotHour = Math.floor(slotTotalMinutes / 60);
      const slotMinute = slotTotalMinutes % 60;
      
      // Stop if we go beyond business hours
      if (slotHour >= 17) {
        break;
      }
      
      const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}:00`;
      slots.push(timeString);
    }
    
    return slots;
  };

  // Log timeSlots state changes
  useEffect(() => {
    console.log('\n🔥 [REAL_AVAILABILITY_FIX] ===== timeSlots STATE CHANGED =====');
    console.log('🔥 [REAL_AVAILABILITY_FIX] New timeSlots state:', {
      length: timeSlots.length,
      availableCount: timeSlots.filter(s => s.available).length,
      fullArray: timeSlots,
      availableSlotsOnly: timeSlots.filter(s => s.available),
      timestamp: new Date().toISOString()
    });
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
