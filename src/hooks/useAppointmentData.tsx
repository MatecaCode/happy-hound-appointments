
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

  // Fetch providers available on a specific date using the new resource availability system
  const fetchAvailableProviders = useCallback(async (type: 'grooming' | 'veterinary', selectedDate: Date) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('🔍 DEBUG: Starting fetchAvailableProviders with new system');
      console.log('🔍 DEBUG: Service type:', type);
      console.log('🔍 DEBUG: Date string:', dateStr);
      
      // Determine resource type based on service type
      const resourceType = type === 'grooming' ? 'groomer' : 'veterinary';
      
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

      // Step 2: Check availability using the new service_availability table
      const providersWithAvailability = [];
      
      for (const provider of providers) {
        console.log(`🔍 DEBUG: Checking availability for ${provider.name} on ${dateStr}`);
        
        const { data: availability, error: availError } = await supabase
          .from('service_availability')
          .select('*')
          .eq('resource_type', resourceType)
          .eq('provider_id', provider.id)
          .eq('date', dateStr)
          .gt('available_capacity', 0);
          
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

  // Fetch available time slots using the new availability system
  const fetchTimeSlots = useCallback(async (selectedDate: Date, selectedGroomerId: string, setIsLoading: (loading: boolean) => void) => {
    if (!selectedDate || !selectedGroomerId) {
      setTimeSlots([]);
      return;
    }

    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Determine if this is a groomer or vet to know which resource type to check
      let resourceType = 'groomer';
      
      // Check if it's a vet
      const { data: vetCheck } = await supabase
        .from('veterinarians')
        .select('id')
        .eq('id', selectedGroomerId)
        .single();
        
      if (vetCheck) {
        resourceType = 'veterinary';
      }
      
      // Get available slots from service_availability
      const { data: availability, error: availError } = await supabase
        .from('service_availability')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr)
        .gt('available_capacity', 0)
        .order('time_slot');

      if (availError) throw availError;

      // Transform to TimeSlot format
      const slots: TimeSlot[] = (availability || []).map(slot => ({
        id: slot.time_slot,
        time: slot.time_slot,
        available: slot.available_capacity > 0
      }));

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
