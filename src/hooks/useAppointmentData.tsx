import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  generateClientTimeSlots, 
  isClientSlotAvailable,
  formatTimeSlot 
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
  role: string;
  rating: number;
  about: string;
  profile_image?: string;
  specialty?: string;
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
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('client_id', userId);

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
      let roleFilter = '';
      if (serviceType === 'grooming') {
        roleFilter = 'Groomer';
      } else if (serviceType === 'veterinary') {
        roleFilter = 'Veterinarian';
      }

      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('role', roleFilter)
        .eq('active', true);

      if (error) {
        console.error('Error fetching available groomers:', error);
        toast.error('Erro ao buscar profissionais disponíveis');
        return;
      }

      setGroomers(data || []);
    } catch (error) {
      console.error('Unexpected error fetching available groomers:', error);
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
      console.log('⚠️ [FETCH_TIME_SLOTS] Missing required parameters');
      setTimeSlots([]);
      return;
    }

    console.log('🕐 [FETCH_TIME_SLOTS] Starting with 10min granular logic:', {
      date: date.toISOString().split('T')[0],
      staffId,
      serviceDuration: selectedService.default_duration || 60
    });

    setIsLoading(true);

    try {
      const dateStr = date.toISOString().split('T')[0];
      const serviceDuration = selectedService.default_duration || 60;

      // Fetch all 10-minute granular availability for the staff on this date
      const { data: availabilityData, error } = await supabase
        .from('staff_availability')
        .select('time_slot, available')
        .eq('staff_profile_id', staffId)
        .eq('date', dateStr);

      if (error) {
        console.error('❌ [FETCH_TIME_SLOTS] Error fetching staff availability:', error);
        toast.error('Erro ao buscar horários disponíveis');
        setTimeSlots([]);
        return;
      }

      console.log(`📊 [FETCH_TIME_SLOTS] Fetched ${availabilityData?.length || 0} 10-min availability records`);

      // Generate 30-minute client slots and check availability using 10-minute granular logic
      const clientSlots = generateClientTimeSlots();
      const availableSlots: TimeSlot[] = [];

      for (const clientSlot of clientSlots) {
        const isAvailable = isClientSlotAvailable(
          clientSlot, 
          serviceDuration, 
          availabilityData || []
        );

        availableSlots.push({
          id: clientSlot,
          time: formatTimeSlot(clientSlot),
          available: isAvailable
        });
      }

      console.log(`✅ [FETCH_TIME_SLOTS] Generated ${availableSlots.length} client slots, ${availableSlots.filter(s => s.available).length} available`);
      setTimeSlots(availableSlots);

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
    fetchAvailableProviders: useCallback(async () => {
      try {
        const { data, error } = await supabase
          .from('staff_profiles')
          .select('*')
          .eq('role', 'Groomer')
          .eq('active', true);
  
        if (error) {
          console.error('Error fetching available groomers:', error);
          toast.error('Erro ao buscar profissionais disponíveis');
          return;
        }
  
        setGroomers(data || []);
      } catch (error) {
        console.error('Unexpected error fetching available groomers:', error);
        toast.error('Erro inesperado ao buscar profissionais');
      }
    }, []),
    fetchServices: useCallback(async () => {
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
    }, []),
    fetchUserPets: useCallback(async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('pets')
          .select('*')
          .eq('client_id', userId);
  
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
    }, []),
    fetchTimeSlots,
  };
};
