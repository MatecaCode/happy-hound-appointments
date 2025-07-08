import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  generateClientTimeSlots, 
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
    console.log('\n🔥 ===== TIME SLOT PIPELINE START =====');
    console.log('🔥 Input Parameters:', {
      date: date?.toISOString(),
      staffIds,
      selectedService: selectedService?.name,
      serviceDuration: selectedService?.default_duration || 60
    });

    // Prevent unnecessary fetches
    if (!selectedService || !date || !staffIds || staffIds.length === 0) {
      console.log('🔥 Missing required parameters - CLEARING SLOTS');
      setTimeSlots([]);
      return;
    }

    // CRITICAL: Deduplicate staff IDs
    const uniqueStaffIds = [...new Set(staffIds)];
    console.log('🔥 Unique Staff IDs:', uniqueStaffIds);
    
    const dateForQuery = format(date, 'yyyy-MM-dd');
    const serviceDuration = selectedService.default_duration || 60;

    setIsLoading(true);

    try {
      // STEP 1: Fetch RAW availability from Supabase - ALL records (TRUE and FALSE)
      console.log('\n📋 STEP 1: Fetching RAW staff availability from database...');
      
      const { data: rawAvailabilityData, error } = await supabase
        .from('staff_availability')
        .select('staff_profile_id, time_slot, available')
        .in('staff_profile_id', uniqueStaffIds)
        .eq('date', dateForQuery);

      if (error) {
        console.error('❌ Error fetching staff availability:', error);
        toast.error('Erro ao buscar horários disponíveis');
        setTimeSlots([]);
        return;
      }

      console.log('📊 RAW SUPABASE RESPONSE:');
      console.log('   Total records:', rawAvailabilityData?.length || 0);
      console.log('   Raw data:', rawAvailabilityData);
      
      if (!rawAvailabilityData || rawAvailabilityData.length === 0) {
        console.log('⚠️ NO RAW AVAILABILITY DATA FOUND!');
        setTimeSlots([]);
        setIsLoading(false);
        return;
      }

      // STEP 2: Build FULL MATRIX - every 10-min slot for every staff
      console.log('\n📋 STEP 2: Building full availability matrix...');
      
      // Generate all possible 10-minute slots for the day
      const all10MinSlots: string[] = [];
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 10) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          all10MinSlots.push(timeString);
        }
      }

      // Build matrix: [time_slot][staff_id] = available value
      const availabilityMatrix: Record<string, Record<string, boolean>> = {};
      
      // Initialize matrix with all slots as unavailable (FALSE)
      for (const slot of all10MinSlots) {
        availabilityMatrix[slot] = {};
        for (const staffId of uniqueStaffIds) {
          availabilityMatrix[slot][staffId] = false; // Default to FALSE
        }
      }

      // Fill matrix with actual data from database
      rawAvailabilityData.forEach(record => {
        if (availabilityMatrix[record.time_slot]) {
          availabilityMatrix[record.time_slot][record.staff_profile_id] = record.available;
        }
      });

      console.log('🗂️ FULL AVAILABILITY MATRIX:');
      console.table(availabilityMatrix);

      // STEP 3: Check each 30-minute slot for full duration availability
      console.log('\n📋 STEP 3: Checking 30-minute slots for availability...');
      
      const clientSlots = generateClientTimeSlots();
      const availableSlots: TimeSlot[] = [];

      for (const clientSlot of clientSlots) {
        console.log(`\n🔍 Checking 30-min slot: ${clientSlot}`);
        
        // Get all 10-minute slots needed for this service duration
        const requiredSlots = getRequiredBackendSlots(clientSlot, serviceDuration);
        console.log(`📋 Required 10-min slots:`, requiredSlots);
        
        let isSlotAvailable = true;
        let blockingReason = '';

        // Check if ALL required slots are available for ALL selected staff
        for (const requiredSlot of requiredSlots) {
          for (const staffId of uniqueStaffIds) {
            const staffAvailable = availabilityMatrix[requiredSlot]?.[staffId];
            
            if (!staffAvailable) {
              isSlotAvailable = false;
              blockingReason = `Staff ${staffId} unavailable at ${requiredSlot}`;
              console.log(`❌ BLOCKED: ${blockingReason}`);
              break;
            }
          }
          if (!isSlotAvailable) break;
        }

        if (isSlotAvailable) {
          console.log(`✅ AVAILABLE: ${clientSlot}`);
        } else {
          console.log(`❌ UNAVAILABLE: ${clientSlot} - ${blockingReason}`);
        }

        availableSlots.push({
          id: clientSlot,
          time: formatTimeSlot(clientSlot),
          available: isSlotAvailable
        });
      }

      console.log('\n📊 FINAL AVAILABLE SLOTS ARRAY:');
      console.log('Available slots array:', availableSlots);
      console.log('Total slots:', availableSlots.length);
      console.log('Available count:', availableSlots.filter(s => s.available).length);
      console.log('Unavailable count:', availableSlots.filter(s => !s.available).length);

      // STEP 4: Set state - no modification, no filtering
      console.log('\n📋 STEP 4: Setting timeSlots state...');
      console.log('🔥 BEFORE setTimeSlots - availableSlots array:', availableSlots);
      
      setTimeSlots(availableSlots);
      
      console.log('🔥 setTimeSlots called with array length:', availableSlots.length);

    } catch (error) {
      console.error('❌ Pipeline error:', error);
      toast.error('Erro inesperado ao buscar horários');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to get required backend slots
  const getRequiredBackendSlots = (startTime: string, durationMinutes: number): string[] => {
    const slots: string[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    
    for (let offset = 0; offset < durationMinutes; offset += 10) {
      const slotTotalMinutes = startTotalMinutes + offset;
      const slotHour = Math.floor(slotTotalMinutes / 60);
      const slotMinute = slotTotalMinutes % 60;
      
      if (slotHour >= 17) break;
      
      const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}:00`;
      slots.push(timeString);
    }
    
    return slots;
  };

  // Monitor timeSlots state changes
  useEffect(() => {
    console.log('\n🔥 ===== timeSlots STATE CHANGED =====');
    console.log('🔥 New timeSlots state:', timeSlots);
    console.log('🔥 State length:', timeSlots.length);
    console.log('🔥 Available in state:', timeSlots.filter(s => s.available).length);
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
