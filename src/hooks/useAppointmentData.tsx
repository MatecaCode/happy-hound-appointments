
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

  // Fetch providers available on a specific date using provider_availability table
  const fetchAvailableProviders = useCallback(async (
    type: 'grooming' | 'veterinary', 
    selectedDate: Date,
    selectedService: Service | null = null
  ) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('🔍 DEBUG: Starting fetchAvailableProviders');
      console.log('🔍 DEBUG: Service type:', type);
      console.log('🔍 DEBUG: Date string:', dateStr);
      console.log('🔍 DEBUG: Selected service:', selectedService);
      
      // Determine provider type
      const providerType = type === 'grooming' ? 'groomer' : 'veterinary';
      
      // Step 1: Get all providers of the correct type
      const tableName = type === 'grooming' ? 'groomers' : 'veterinarians';
      let { data: providers, error: providersError } = await supabase
        .from(tableName)
        .select('*');

      console.log('🔍 DEBUG: All providers found:', providers);

      if (providersError) throw providersError;

      if (!providers || providers.length === 0) {
        console.log('❌ No providers found in', tableName);
        setGroomers([]);
        return;
      }

      // Step 2: Check which providers are available on the selected date
      const availableProviders = [];
      
      for (const provider of providers) {
        console.log(`🔍 DEBUG: Checking availability for ${provider.name} on ${dateStr}`);
        
        // Check provider_availability table for this provider on this date
        const { data: availability, error: availError } = await supabase
          .from('provider_availability')
          .select('*')
          .eq('provider_id', provider.id)
          .eq('date', dateStr)
          .eq('available', true);
          
        console.log(`🔍 DEBUG: Availability for ${provider.name}:`, availability);
        
        if (availability && availability.length > 0) {
          // Check if any of these slots are still free (not booked in appointments)
          const hasAvailableSlots = await checkProviderHasAvailableSlots(
            provider.id, 
            dateStr, 
            selectedService?.duration || 30
          );
          
          if (hasAvailableSlots) {
            console.log(`✅ Provider ${provider.name} has available slots`);
            availableProviders.push(provider);
          } else {
            console.log(`❌ Provider ${provider.name} has no available slots (all booked)`);
          }
        } else {
          console.log(`❌ Provider ${provider.name} has no availability on ${dateStr}`);
        }
      }

      // Transform for UI
      const transformedProviders: Provider[] = availableProviders.map(provider => ({
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

  // Helper function to check if a provider has any available slots on a date
  const checkProviderHasAvailableSlots = useCallback(async (
    providerId: string,
    dateStr: string,
    serviceDuration: number = 30
  ) => {
    try {
      // Get all provider availability slots for this date
      const { data: availabilitySlots, error: availError } = await supabase
        .from('provider_availability')
        .select('time_slot')
        .eq('provider_id', providerId)
        .eq('date', dateStr)
        .eq('available', true)
        .order('time_slot');

      if (availError || !availabilitySlots || availabilitySlots.length === 0) {
        return false;
      }

      // Get all existing appointments for this provider on this date
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('time')
        .eq('provider_id', providerId)
        .eq('date', dateStr);

      if (appointmentsError) {
        console.error('Error checking appointments:', appointmentsError);
        return false;
      }

      const bookedTimes = new Set(appointments?.map(apt => apt.time) || []);
      
      // Check if any available slots are not booked
      for (const slot of availabilitySlots) {
        if (!bookedTimes.has(slot.time_slot)) {
          return true; // Found at least one available slot
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking provider slots:', error);
      return false;
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

  // Fetch available time slots for a specific provider and date
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
      
      console.log('🔍 DEBUG: Fetching time slots for groomer:', selectedGroomerId, 'on date:', dateStr);
      
      // Get available slots from provider_availability for this groomer and date
      const { data: availabilitySlots, error: availError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr)
        .eq('available', true)
        .order('time_slot');

      if (availError) throw availError;

      console.log('🔍 DEBUG: Provider availability slots:', availabilitySlots);

      if (!availabilitySlots || availabilitySlots.length === 0) {
        console.log('❌ No availability slots found for this provider and date');
        setTimeSlots([]);
        return;
      }

      // Get existing appointments for this provider on this date
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('time')
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr);

      if (appointmentsError) throw appointmentsError;

      console.log('🔍 DEBUG: Existing appointments:', appointments);

      const bookedTimes = new Set(appointments?.map(apt => apt.time) || []);
      
      // Transform to TimeSlot format, marking slots as unavailable if already booked
      const slots: TimeSlot[] = availabilitySlots.map(slot => ({
        id: slot.time_slot,
        time: slot.time_slot,
        available: !bookedTimes.has(slot.time_slot)
      }));

      console.log('✅ Final time slots:', slots);
      setTimeSlots(slots);
      
    } catch (error: any) {
      console.error('💥 Error fetching time slots:', error);
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
    checkProviderHasAvailableSlots,
  };
};
