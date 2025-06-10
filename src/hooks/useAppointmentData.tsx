
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getRequiredResources } from '@/utils/appointmentUtils';

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

  // Check if all required resources are available for a given date
  const checkResourceAvailability = useCallback(async (
    requiredResources: string[],
    selectedDate: Date,
    selectedService: Service | null
  ) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('🔍 Checking resource availability for:', requiredResources, 'on', dateStr);
      
      for (const resourceType of requiredResources) {
        const { data: availability, error } = await supabase
          .from('service_availability')
          .select('*')
          .eq('resource_type', resourceType)
          .eq('date', dateStr)
          .gt('available_capacity', 0);
          
        if (error) {
          console.error(`Error checking ${resourceType} availability:`, error);
          return false;
        }
        
        if (!availability || availability.length === 0) {
          console.log(`❌ No ${resourceType} availability on ${dateStr}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking resource availability:', error);
      return false;
    }
  }, []);

  // Fetch providers available on a specific date using the new resource availability system
  const fetchAvailableProviders = useCallback(async (
    type: 'grooming' | 'veterinary', 
    selectedDate: Date,
    selectedService: Service | null = null
  ) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('🔍 DEBUG: Starting fetchAvailableProviders with new system');
      console.log('🔍 DEBUG: Service type:', type);
      console.log('🔍 DEBUG: Date string:', dateStr);
      console.log('🔍 DEBUG: Selected service:', selectedService);
      
      // Determine resource type and check if this service needs a groomer/vet
      const resourceType = type === 'grooming' ? 'groomer' : 'veterinary';
      
      // Check if this service actually needs a provider (some services might just need shower)
      if (selectedService) {
        const requiredResources = getRequiredResources(selectedService.service_type, selectedService.name);
        
        // If the service doesn't require this type of provider, return empty array
        if (!requiredResources.includes(resourceType)) {
          console.log(`Service ${selectedService.name} doesn't require ${resourceType}`);
          setGroomers([]);
          return;
        }
        
        // Check if all required resources are available on this date
        const allResourcesAvailable = await checkResourceAvailability(requiredResources, selectedDate, selectedService);
        if (!allResourcesAvailable) {
          console.log('❌ Not all required resources available on this date');
          setGroomers([]);
          return;
        }
      }
      
      // Step 1: Get providers from the appropriate table
      const tableName = type === 'grooming' ? 'groomers' : 'veterinarians';
      let { data: providers, error: providersError } = await supabase
        .from(tableName)
        .select('*');

      console.log('🔍 DEBUG: Providers found:', providers);

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
  }, [checkResourceAvailability]);

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
  const fetchTimeSlots = useCallback(async (
    selectedDate: Date, 
    selectedGroomerId: string, 
    setIsLoading: (loading: boolean) => void,
    selectedService: Service | null = null
  ) => {
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
      
      // Get required resources for this service
      let requiredResources = [resourceType];
      if (selectedService) {
        requiredResources = getRequiredResources(selectedService.service_type, selectedService.name);
      }
      
      console.log('🔍 Required resources for time slots:', requiredResources);
      
      // Get available slots from service_availability for the main provider
      const { data: providerAvailability, error: availError } = await supabase
        .from('service_availability')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr)
        .gt('available_capacity', 0)
        .order('time_slot');

      if (availError) throw availError;

      if (!providerAvailability || providerAvailability.length === 0) {
        setTimeSlots([]);
        return;
      }

      // For each provider slot, check if all other required resources are also available
      const availableSlots = [];
      
      for (const slot of providerAvailability) {
        let slotAvailable = true;
        
        // Check all other required resources for this time slot
        for (const resource of requiredResources) {
          if (resource === resourceType) continue; // Skip the main provider, we already checked it
          
          const { data: resourceAvail } = await supabase
            .from('service_availability')
            .select('available_capacity')
            .eq('resource_type', resource)
            .eq('date', dateStr)
            .eq('time_slot', slot.time_slot)
            .gt('available_capacity', 0)
            .single();
            
          if (!resourceAvail) {
            slotAvailable = false;
            break;
          }
        }
        
        if (slotAvailable) {
          availableSlots.push(slot);
        }
      }

      // Transform to TimeSlot format
      const slots: TimeSlot[] = availableSlots.map(slot => ({
        id: slot.time_slot,
        time: slot.time_slot,
        available: true
      }));

      console.log('✅ Available time slots:', slots);
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
    checkResourceAvailability,
  };
};
