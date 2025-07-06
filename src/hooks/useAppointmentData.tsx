import { useState, useEffect, useCallback } from 'react';
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
    staffId: string | null,
    setIsLoading: (loading: boolean) => void,
    selectedService: Service | null
  ) => {
    if (!selectedService || !staffId) {
      console.log('Missing required parameters');
      setTimeSlots([]);
      return;
    }

    console.log('🔍 [FETCH_TIME_SLOTS] Starting simple fetch...');
    
    const dateForQuery = format(date, 'yyyy-MM-dd');
    const serviceDuration = selectedService.default_duration || 60;
    
    console.log('📋 [FETCH_TIME_SLOTS] Parameters:', {
      date: dateForQuery,
      staffId,
      serviceDuration
    });

    setIsLoading(true);

    try {
      // Fetch all 10-minute availability for the staff on this date
      const { data: availabilityData, error } = await supabase
        .from('staff_availability')
        .select('time_slot, available')
        .eq('staff_profile_id', staffId)
        .eq('date', dateForQuery);

      if (error) {
        console.error('❌ Error fetching staff availability:', error);
        toast.error('Erro ao buscar horários disponíveis');
        setTimeSlots([]);
        return;
      }

      console.log(`📊 [FETCH_TIME_SLOTS] Raw availability data: ${availabilityData?.length || 0} records`);

      if (!availabilityData || availabilityData.length === 0) {
        console.log('⚠️ [FETCH_TIME_SLOTS] NO AVAILABILITY DATA FOUND!');
        setTimeSlots([]);
        setIsLoading(false);
        return;
      }

      // Generate 30-minute client slots and check availability
      console.log('🔄 [FETCH_TIME_SLOTS] Generating 30-minute client slots...');
      const clientSlots = generateClientTimeSlots();
      
      const availableSlots: TimeSlot[] = [];

      for (const clientSlot of clientSlots) {
        const isAvailable = isClientSlotAvailable(
          clientSlot, 
          serviceDuration, 
          availabilityData
        );

        const slotObject = {
          id: clientSlot,
          time: formatTimeSlot(clientSlot),
          available: isAvailable
        };

        availableSlots.push(slotObject);
        
        if (isAvailable) {
          console.log(`✅ [FETCH_TIME_SLOTS] Available slot: ${clientSlot}`);
        }
      }

      console.log(`📊 [FETCH_TIME_SLOTS] Final Results:`);
      console.log(`   Total slots generated: ${availableSlots.length}`);
      console.log(`   Available slots: ${availableSlots.filter(s => s.available).length}`);
      
      const availableSlotTimes = availableSlots.filter(s => s.available).map(s => s.time);
      console.log(`   Available times:`, availableSlotTimes);

      setTimeSlots(availableSlots);

    } catch (error) {
      console.error('❌ [FETCH_TIME_SLOTS] Unexpected error:', error);
      toast.error('Erro inesperado ao buscar horários');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('timeSlots state changed:', timeSlots);
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
