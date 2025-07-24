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

  const fetchServices = useCallback(async (serviceType?: 'grooming' | 'veterinary') => {
    try {
      let query = supabase
        .from('services')
        .select('*')
        .eq('active', true);

      // Filter services based on service type
      if (serviceType === 'grooming') {
        // For grooming, show services that require bath or grooming (but not vet)
        query = query.or('requires_bath.eq.true,requires_grooming.eq.true').eq('requires_vet', false);
      } else if (serviceType === 'veterinary') {
        // For veterinary, show services that require vet
        query = query.eq('requires_vet', true);
      }

      const { data, error } = await query;

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

      // Then fetch pets using the client_id with breed information
      const { data, error } = await supabase
        .from('pets')
        .select(`
          *,
          breeds(name)
        `)
        .eq('client_id', clientData.id);

      if (error) {
        console.error('Error fetching user pets:', error);
        toast.error('Erro ao buscar pets do usuário');
        return;
      }

      // Transform data to include breed name from join
      const transformedPets = data?.map(pet => ({
        ...pet,
        breed: pet.breeds?.name || pet.breed // Use joined breed name or fallback to existing breed field
      })) || [];
      
      setUserPets(transformedPets);
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
    if (!selectedService || !date) {
      setTimeSlots([]);
      return;
    }
    
    // If no staff provided, return all available slots for services that don't require staff
    if (!staffIds || staffIds.length === 0) {
      const serviceRequiresStaff = selectedService.requires_grooming || selectedService.requires_vet || selectedService.requires_bath;
      
      if (serviceRequiresStaff) {
        setTimeSlots([]);
        return;
      } else {
        // Generate default time slots for services that don't require staff
        const defaultSlots = generateClientTimeSlots().map(slot => ({
          id: slot,
          time: formatTimeSlot(slot),
          available: true
        }));
        setTimeSlots(defaultSlots);
        return;
      }
    }

    // Deduplicate staff IDs
    const uniqueStaffIds = [...new Set(staffIds)];
    
    const dateForQuery = format(date, 'yyyy-MM-dd');
    const serviceDuration = selectedService.default_duration || 60;

    setIsLoading(true);

    try {
      // Fetch staff availability from database
      const { data: rawAvailabilityData, error } = await supabase
        .from('staff_availability')
        .select('staff_profile_id, time_slot, available')
        .in('staff_profile_id', uniqueStaffIds)
        .eq('date', dateForQuery);

      if (error) {
        console.error('Error fetching staff availability:', error);
        toast.error('Erro ao buscar horários disponíveis');
        setTimeSlots([]);
        return;
      }
      
      if (!rawAvailabilityData || rawAvailabilityData.length === 0) {
        setTimeSlots([]);
        setIsLoading(false);
        return;
      }

      // Build availability matrix
      const all10MinSlots: string[] = [];
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 10) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          all10MinSlots.push(timeString);
        }
      }

      const availabilityMatrix: Record<string, Record<string, boolean>> = {};
      
      // Initialize matrix with all slots as unavailable
      for (const slot of all10MinSlots) {
        availabilityMatrix[slot] = {};
        for (const staffId of uniqueStaffIds) {
          availabilityMatrix[slot][staffId] = false;
        }
      }

      // Fill matrix with actual data from database
      rawAvailabilityData.forEach(record => {
        if (availabilityMatrix[record.time_slot]) {
          availabilityMatrix[record.time_slot][record.staff_profile_id] = record.available;
        }
      });

      // Check each 30-minute slot for availability
      const clientSlots = generateClientTimeSlots();
      const availableSlots: TimeSlot[] = [];

      for (const clientSlot of clientSlots) {
        let isSlotAvailable = true;

        // Get all required slots for the full service duration
        const requiredSlots = getRequiredBackendSlots(clientSlot, serviceDuration);
        
        // Check if ALL selected staff are available for ALL required slots
        for (const staffId of uniqueStaffIds) {
          let staffAvailable = true;
          
          for (const requiredSlot of requiredSlots) {
            if (!availabilityMatrix[requiredSlot] || availabilityMatrix[requiredSlot][staffId] !== true) {
              staffAvailable = false;
              break;
            }
          }
          
          if (!staffAvailable) {
            isSlotAvailable = false;
            break;
          }
        }

        availableSlots.push({
          id: clientSlot,
          time: formatTimeSlot(clientSlot),
          available: isSlotAvailable
        });
      }

      setTimeSlots(availableSlots);

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

  // Monitor critical time slot issues
  useEffect(() => {
    const availableCount = timeSlots.filter(s => s.available).length;
    if (timeSlots.length > 0 && availableCount === 0) {
      console.log('[TIME_SLOTS] No available slots found for current selection');
    }
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
