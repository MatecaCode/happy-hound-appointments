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

  // Helper function to check if a provider has any available slots on a date
  const checkProviderHasAvailableSlots = useCallback(async (
    providerId: string,
    dateStr: string,
    serviceDurationMinutes: number = 30
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
        console.log(`No base availability found for ${providerId} on ${dateStr}`);
        return false;
      }

      // Convert time_slot strings to a comparable format (e.g., minutes from midnight)
      const availableSlotTimesInMinutes = availabilitySlots.map(slot => {
        const [hour, minute] = slot.time_slot.split(':').map(Number);
        return hour * 60 + minute;
      }).sort((a, b) => a - b); // Ensure sorted

      // Get all existing appointments for this provider on this date
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('time, service_id')
        .eq('provider_id', providerId)
        .eq('date', dateStr);

      if (appointmentsError) {
        console.error('Error checking appointments:', appointmentsError);
        return false;
      }

      // Fetch services to get their durations
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('id, duration');
      if (servicesError) {
        console.error('Error fetching all services for duration check:', servicesError);
        return false;
      }
      const serviceDurationsMap = new Map(allServices?.map(s => [s.id, s.duration]));

      // Mark booked time blocks. A booked slot takes up its duration.
      const occupiedTimeBlocks = new Set<number>(); // Stores minutes from midnight for occupied blocks
      appointments?.forEach(apt => {
        const [aptHour, aptMinute] = apt.time.split(':').map(Number);
        const aptStartTimeInMinutes = aptHour * 60 + aptMinute;
        const aptDuration = serviceDurationsMap.get(apt.service_id) || 30; // Default to 30 if not found

        for (let i = 0; i < aptDuration; i += 30) { // Mark every 30-min block that the appointment covers
          occupiedTimeBlocks.add(aptStartTimeInMinutes + i);
        }
      });

      const requiredSlots = Math.ceil(serviceDurationMinutes / 30);

      for (let i = 0; i <= availableSlotTimesInMinutes.length - requiredSlots; i++) {
        const currentStartTime = availableSlotTimesInMinutes[i];
        let isBlockAvailable = true;

        for (let j = 0; j < requiredSlots; j++) {
          const checkTime = currentStartTime + (j * 30);

          // Ensure this checkTime is actually one of the available slots for the provider
          // AND not booked, AND sequential.
          if (!availableSlotTimesInMinutes.includes(checkTime) || occupiedTimeBlocks.has(checkTime)) {
            isBlockAvailable = false;
            break;
          }
        }

        if (isBlockAvailable) {
          return true; // Found a contiguous block of available time
        }
      }

      return false; // No available contiguous block found
    } catch (error) {
      console.error('Error checking provider slots:', error);
      return false;
    }
  }, []);

  // Fetch providers available on a specific date using role-based filtering
  const fetchAvailableProviders = useCallback(async (
    type: 'grooming' | 'veterinary', 
    selectedDate: Date,
    selectedService: Service | null = null
  ) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const targetRole = type === 'grooming' ? 'groomer' : 'vet';

      // Get provider profiles based on role
      const { data: providers, error: providersError } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('type', targetRole);

      if (providersError) throw providersError;

      if (!providers || providers.length === 0) {
        setGroomers([]);
        return;
      }

      // Check which providers are available on the selected date
      const availableProviders = [];
      
      for (const provider of providers) {
        const { data: availability, error: availError } = await supabase
          .from('provider_availability')
          .select('*')
          .eq('provider_id', provider.id)
          .eq('date', dateStr)
          .eq('available', true);
        if (availability && availability.length > 0) {
          const hasAvailableSlots = await checkProviderHasAvailableSlots(
            provider.id, 
            dateStr, 
            selectedService?.duration || 30
          );
          if (hasAvailableSlots) {
            availableProviders.push(provider);
          }
        }
      }

      // Transform for UI
      const transformedProviders: Provider[] = availableProviders.map(provider => ({
        id: provider.id,
        name: provider.name ?? '',
        role: targetRole,
        profile_image: provider.photo_url,
        rating: provider.rating || 4.5,
        specialty: provider.specialty ?? '',
        about: provider.bio ?? ''
      }));

      setGroomers(transformedProviders);
      
    } catch (error: any) {
      console.error('💥 Error in fetchAvailableProviders:', error);
      toast.error('Erro ao carregar profissionais');
      setGroomers([]);
    }
  }, [checkProviderHasAvailableSlots]);

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
      
      console.log('🔍 DEBUG: Fetching time slots for provider:', selectedGroomerId, 'on date:', dateStr);
      
      // Get available slots from provider_availability for this provider and date
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
        .select('time, service_id')
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr);

      if (appointmentsError) throw appointmentsError;

      console.log('🔍 DEBUG: Existing appointments:', appointments);

      // Get all services to map service_id to duration
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('id, duration');
      if (servicesError) throw servicesError;
      const serviceDurationsMap = new Map(allServices?.map(s => [s.id, s.duration]));

      // Mark booked time blocks
      const bookedTimeBlocks = new Set<number>(); // Stores minutes from midnight for occupied blocks
      appointments?.forEach(apt => {
        const [aptHour, aptMinute] = apt.time.split(':').map(Number);
        const aptStartTimeInMinutes = aptHour * 60 + aptMinute;
        const aptDuration = serviceDurationsMap.get(apt.service_id) || 30;

        for (let i = 0; i < aptDuration; i += 30) { // Mark every 30-min block that the appointment covers
          bookedTimeBlocks.add(aptStartTimeInMinutes + i);
        }
      });

      const requiredSlots = Math.ceil((selectedService?.duration || 30) / 30);

      // Convert available time slots to minutes from midnight for easier calculation
      const availableTimesInMinutes = new Set(availabilitySlots.map(slot => {
        const [hour, minute] = slot.time_slot.split(':').map(Number);
        return hour * 60 + minute;
      }));

      const finalAvailableSlots: TimeSlot[] = [];

      for (const slot of availabilitySlots) {
        const [hour, minute] = slot.time_slot.split(':').map(Number);
        const currentSlotTimeInMinutes = hour * 60 + minute;
        let isSlotBlockAvailable = true;

        for (let i = 0; i < requiredSlots; i++) {
          const checkTime = currentSlotTimeInMinutes + (i * 30);
          // Check if this time slot is within the provider's general availability
          // AND not already booked by another appointment
          if (!availableTimesInMinutes.has(checkTime) || bookedTimeBlocks.has(checkTime)) {
            isSlotBlockAvailable = false;
            break;
          }
        }

        finalAvailableSlots.push({
          id: slot.time_slot,
          time: slot.time_slot,
          available: isSlotBlockAvailable
        });
      }

      // Sort the slots by time before setting state
      finalAvailableSlots.sort((a, b) => {
        const [aHour, aMinute] = a.time.split(':').map(Number);
        const [bHour, bMinute] = b.time.split(':').map(Number);
        return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
      });

      console.log('✅ Final time slots:', finalAvailableSlots);
      setTimeSlots(finalAvailableSlots);
      
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
