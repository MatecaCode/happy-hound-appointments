
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Provider {
  id: string;
  name: string;
  role: string;
  profile_image?: string;
  rating?: number;
  specialty?: string;
  about?: string;
}

export interface Pet {
  id: string;
  name: string;
  breed?: string;
  age?: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  service_type: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface NextAvailable {
  date: string;
  time: string;
  provider_name: string;
}

export const useAppointmentData = () => {
  // Data state
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [nextAvailable, setNextAvailable] = useState<NextAvailable | null>(null);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [groomers, setGroomers] = useState<Provider[]>([]);

  // Fetch providers available on a specific date using the new separate tables
  const fetchAvailableProviders = useCallback(async (type: 'grooming' | 'veterinary', selectedDate: Date) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('🔍 DEBUG: Starting fetchAvailableProviders');
      console.log('🔍 DEBUG: Service type:', type);
      console.log('🔍 DEBUG: Date string:', dateStr);
      
      // Step 1: Get providers from the appropriate table
      const tableName = type === 'grooming' ? 'groomers' : 'veterinarians';
      let { data: providers, error: providersError } = await supabase
        .from(tableName)
        .select('*');

      console.log('🔍 DEBUG: Providers found:', providers);
      console.log('🔍 DEBUG: Providers error:', providersError);

      if (providersError) throw providersError;

      if (!providers || providers.length === 0) {
        console.log('❌ No providers found in', tableName);
        setGroomers([]);
        return;
      }

      // Step 2: Check availability for each provider
      const providersWithAvailability = [];
      
      for (const provider of providers) {
        console.log(`🔍 DEBUG: Checking availability for ${provider.name} on ${dateStr}`);
        
        const { data: availability, error: availError } = await supabase
          .from('provider_availability')
          .select('*')
          .eq('provider_id', provider.id)
          .eq('date', dateStr)
          .eq('available', true);
          
        console.log(`🔍 DEBUG: Availability for ${provider.name}:`, availability);
        
        if (availability && availability.length > 0) {
          console.log(`✅ Provider ${provider.name} has ${availability.length} available slots`);
          providersWithAvailability.push(provider);
        } else {
          console.log(`❌ Provider ${provider.name} has no available slots on ${dateStr}`);
        }
      }

      // Transform for UI
      const transformedProviders: Provider[] = providersWithAvailability.map(provider => ({
        id: provider.id,
        name: provider.name,
        role: type === 'grooming' ? 'groomer' : 'vet',
        profile_image: provider.profile_image,
        rating: provider.rating || 4.5,
        specialty: provider.specialty,
        about: provider.about
      }));

      console.log('✅ Final transformed providers:', transformedProviders);
      setGroomers(transformedProviders);
      
    } catch (error: any) {
      console.error('💥 Error in fetchAvailableProviders:', error);
      toast.error('Erro ao carregar profissionais');
      setGroomers([]);
    }
  }, []);

  // Fetch services based on service type
  const fetchServices = useCallback(async (type: 'grooming' | 'veterinary') => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('service_type', type)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    }
  }, []);

  // Fetch user's pets
  const fetchUserPets = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      setUserPets(data || []);
    } catch (error: any) {
      console.error('Error fetching pets:', error);
      toast.error('Erro ao carregar pets');
    }
  }, []);

  // Fetch available time slots for selected date and groomer
  const fetchTimeSlots = useCallback(async (selectedDate: Date, selectedGroomerId: string, setIsLoading: (loading: boolean) => void) => {
    if (!selectedDate || !selectedGroomerId) {
      setTimeSlots([]);
      return;
    }

    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Get provider availability
      const { data: availability, error: availError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr)
        .eq('available', true);

      if (availError) throw availError;

      // Get existing appointments
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('time')
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr)
        .eq('status', 'upcoming');

      if (apptError) throw apptError;

      // Create time slots from availability, excluding booked times
      const bookedTimes = appointments?.map(apt => apt.time) || [];
      const slots: TimeSlot[] = (availability || [])
        .filter(slot => !bookedTimes.includes(slot.time_slot))
        .map(slot => ({
          id: slot.time_slot,
          time: slot.time_slot,
          available: true
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      setTimeSlots(slots);
    } catch (error: any) {
      console.error('Error fetching time slots:', error);
      toast.error('Erro ao carregar horários disponíveis');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Data state
    timeSlots,
    setTimeSlots,
    nextAvailable,
    setNextAvailable,
    userPets,
    setUserPets,
    services,
    setServices,
    groomers,
    setGroomers,
    
    // Data fetching functions
    fetchAvailableProviders,
    fetchServices,
    fetchUserPets,
    fetchTimeSlots,
  };
};
