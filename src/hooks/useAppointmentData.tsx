import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useServiceRequirements } from './useServiceRequirements';
import type { Provider, Pet, Service, TimeSlot, NextAvailable } from './useAppointmentForm';

export const useAppointmentData = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [nextAvailable, setNextAvailable] = useState<NextAvailable | null>(null);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [groomers, setGroomers] = useState<Provider[]>([]);

  // Add refs to track the last fetched parameters to prevent unnecessary re-fetches
  const lastTimeSlotsParams = useRef<{
    date?: string;
    groomerId?: string | null;
    serviceId?: string;
  }>({});

  // Track if we're currently fetching to prevent double requests
  const isFetchingTimeSlots = useRef(false);

  // Use centralized service requirements
  const { getServiceRequirements } = useServiceRequirements();

  // Add a function to reset time slots cache
  const resetTimeSlotsCache = useCallback(() => {
    console.log('🔍 DEBUG: Resetting time slots cache');
    lastTimeSlotsParams.current = {};
    setTimeSlots([]);
    setNextAvailable(null);
  }, []);

  const fetchAvailableProviders = useCallback(async (
    serviceType: 'grooming' | 'veterinary',
    date: Date,
    selectedService?: Service
  ) => {
    if (!selectedService) {
      console.log('🔍 DEBUG: No selected service, skipping provider fetch');
      return;
    }

    try {
      console.log('🔍 DEBUG: Fetching providers for:', { serviceType, date, service: selectedService });
      
      const dateStr = date.toISOString().split('T')[0];
      console.log('🔍 DEBUG: Date string:', dateStr);

      // Get service requirements from centralized source
      const serviceRequirements = getServiceRequirements(selectedService.id);
      console.log('🔍 DEBUG: Service requirements from centralized hook:', serviceRequirements);

      // Use the RPC function to get available providers
      const timeSlot = '09:00:00'; // Default time for checking availability
      const duration = selectedService.duration || 30;

      const { data: availableProviders, error } = await supabase.rpc('get_available_providers', {
        _service_id: selectedService.id,
        _date: dateStr,
        _time_slot: timeSlot,
        _duration: duration
      });

      console.log('🔍 DEBUG: RPC get_available_providers result:', availableProviders, 'Error:', error);

      if (error) {
        console.error('Error fetching available providers:', error);
        setGroomers([]);
        return;
      }

      if (!availableProviders || availableProviders.length === 0) {
        console.log('🔍 DEBUG: No available providers found - checking if we have any providers at all');
        
        // Fallback: get all providers of the correct type if RPC fails
        const { data: allProviders, error: allError } = await supabase
          .from('provider_profiles')
          .select('*')
          .eq('type', serviceType === 'grooming' ? 'groomer' : 'vet');

        console.log('🔍 DEBUG: All providers fallback:', allProviders, 'Error:', allError);

        if (!allProviders || allProviders.length === 0) {
          console.log('🔍 DEBUG: No providers found in the system at all!');
          toast.error('Nenhum profissional cadastrado no sistema');
        }

        setGroomers([]);
        return;
      }

      // Get user details for the providers
      const providerUserIds = availableProviders.map((p: any) => p.user_id);
      
      const { data: userData, error: userError } = await supabase
        .from('clients')
        .select('user_id, name')
        .in('user_id', providerUserIds);

      if (userError) {
        console.error('Error fetching user data:', userError);
      }

      // Also try groomers table for names
      const { data: groomerData, error: groomerError } = await supabase
        .from('groomers')
        .select('user_id, name')
        .in('user_id', providerUserIds);

      if (groomerError) {
        console.error('Error fetching groomer data:', groomerError);
      }

      // Also try veterinarians table for names
      const { data: vetData, error: vetError } = await supabase
        .from('veterinarians')
        .select('user_id, name')
        .in('user_id', providerUserIds);

      if (vetError) {
        console.error('Error fetching vet data:', vetError);
      }

      // Combine all name sources
      const allUserData = [
        ...(userData || []),
        ...(groomerData || []),
        ...(vetData || [])
      ];

      console.log('🔍 DEBUG: Combined user data:', allUserData);

      // Map to Provider format
      const formattedProviders: Provider[] = availableProviders.map((provider: any) => {
        const userInfo = allUserData.find(u => u.user_id === provider.user_id);
        return {
          id: provider.user_id, // Use user_id for compatibility
          name: userInfo?.name || `${provider.provider_type} Provider`,
          role: provider.provider_type,
          profile_image: undefined,
          rating: undefined,
          specialty: provider.provider_type === 'groomer' ? 'Tosa e Banho' : 'Veterinária',
          about: undefined
        };
      });

      console.log('🔍 DEBUG: Formatted providers:', formattedProviders);
      setGroomers(formattedProviders);

    } catch (error) {
      console.error('Error in fetchAvailableProviders:', error);
      setGroomers([]);
      toast.error('Erro ao buscar profissionais disponíveis');
    }
  }, [getServiceRequirements]);

  const fetchServices = useCallback(async (serviceType: 'grooming' | 'veterinary') => {
    try {
      console.log('🔍 DEBUG: Fetching services for type:', serviceType);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('service_type', serviceType);

      if (error) {
        console.error('Error fetching services:', error);
        toast.error('Erro ao carregar serviços');
        return;
      }

      const formattedServices: Service[] = (data || []).map(service => ({
        id: service.id,
        name: service.name,
        price: Number(service.price),
        duration: service.duration_minutes || service.duration || 30,
        service_type: service.service_type
      }));

      console.log('🔍 DEBUG: Formatted services:', formattedServices);
      setServices(formattedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    }
  }, []);

  const fetchUserPets = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching pets:', error);
        toast.error('Erro ao carregar pets');
        return;
      }

      const formattedPets: Pet[] = (data || []).map(pet => ({
        id: pet.id,
        name: pet.name,
        breed: pet.breed,
        age: pet.age
      }));

      setUserPets(formattedPets);
    } catch (error) {
      console.error('Error fetching pets:', error);
      toast.error('Erro ao carregar pets');
    }
  }, []);

  const fetchTimeSlots = useCallback(async (
    date: Date | undefined,
    groomerId: string | null,
    setIsLoading: (loading: boolean) => void,
    selectedService?: Service
  ) => {
    if (!date || !selectedService) {
      setTimeSlots([]);
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    
    // Check if we're fetching the same parameters to prevent unnecessary re-fetches
    const currentParams = {
      date: dateStr,
      groomerId,
      serviceId: selectedService.id
    };
    
    if (JSON.stringify(lastTimeSlotsParams.current) === JSON.stringify(currentParams)) {
      console.log('🔍 DEBUG: Skipping time slots fetch - same parameters');
      return;
    }

    // Prevent double requests
    if (isFetchingTimeSlots.current) {
      console.log('🔍 DEBUG: Already fetching time slots, skipping...');
      return;
    }
    
    lastTimeSlotsParams.current = currentParams;
    isFetchingTimeSlots.current = true;

    setIsLoading(true);
    try {
      console.log('🔍 DEBUG: Fetching time slots for:', { date: dateStr, groomerId, service: selectedService });
      
      // Get service requirements from centralized source
      const serviceRequirements = getServiceRequirements(selectedService.id);
      
      if (!serviceRequirements) {
        console.log('🔍 DEBUG: No service requirements found');
        setTimeSlots([]);
        return;
      }

      const requiresGroomer = serviceRequirements.requires_groomer;
      const requiresShower = serviceRequirements.requires_shower;

      console.log('🔍 DEBUG: Service requirements from centralized hook:', { 
        requiresGroomer, 
        requiresShower,
        combo: serviceRequirements.combo
      });

      // If service requires groomer but no groomer selected, return empty slots
      if (requiresGroomer && !groomerId) {
        setTimeSlots([]);
        return;
      }

      // Generate time slots and check availability
      const slots: TimeSlot[] = [];
      const startHour = 9;
      const endHour = 17;
      const serviceDuration = selectedService.duration || 30;

      for (let hour = startHour; hour < endHour; hour++) {
        for (const minutes of [0, 30]) {
          if (hour === 16 && minutes === 30) break; // Don't go past 5 PM
          
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          let isAvailable = true;

          // Check groomer availability if required
          if (requiresGroomer && groomerId) {
            const { data: providerProfile, error: profileError } = await supabase
              .from('provider_profiles')
              .select('id')
              .eq('user_id', groomerId)
              .single();

            if (profileError || !providerProfile) {
              console.error('Provider profile not found:', profileError);
              isAvailable = false;
            } else {
              const { data: availableProviders, error } = await supabase.rpc('get_available_providers', {
                _service_id: selectedService.id,
                _date: dateStr,
                _time_slot: timeSlot,
                _duration: serviceDuration
              });

              isAvailable = !error && 
                           availableProviders && 
                           availableProviders.some((p: any) => p.user_id === groomerId);
            }
          }

          // Check shower availability if required
          if (requiresShower && isAvailable) {
            const { data: showerSlots, error: showerError } = await supabase
              .from('shower_availability')
              .select('available_spots')
              .eq('date', dateStr)
              .eq('time_slot', timeSlot)
              .single();

            if (showerError || !showerSlots || showerSlots.available_spots <= 0) {
              isAvailable = false;
            }
          }

          slots.push({
            id: `${hour}:${minutes.toString().padStart(2, '0')}`,
            time: `${hour}:${minutes.toString().padStart(2, '0')}`,
            available: isAvailable
          });
        }
      }

      console.log('🔍 DEBUG: Generated time slots:', slots);
      setTimeSlots(slots);

      // Find next available slot
      const availableSlot = slots.find(slot => slot.available);
      if (availableSlot) {
        const providerName = requiresGroomer && groomerId 
          ? groomers.find(g => g.id === groomerId)?.name || 'Profissional'
          : 'Banho Disponível';
        setNextAvailable({
          date: dateStr,
          time: availableSlot.time,
          provider_name: providerName
        });
      } else {
        setNextAvailable(null);
      }

    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Erro ao carregar horários disponíveis');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
      isFetchingTimeSlots.current = false;
    }
  }, [groomers, getServiceRequirements]);

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
    resetTimeSlotsCache,
  };
};
