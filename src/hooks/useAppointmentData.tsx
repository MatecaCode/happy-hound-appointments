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

  // Enhanced tracking to prevent unnecessary re-fetches
  const lastTimeSlotsParams = useRef<{
    date?: string;
    groomerId?: string | null;
    serviceId?: string;
    fetchId?: string;
  }>({});

  // Track if we're currently fetching to prevent double requests
  const isFetchingTimeSlots = useRef(false);

  // Use centralized service requirements
  const { getServiceRequirements } = useServiceRequirements();

  // Function to reset time slots cache when needed
  const resetTimeSlotsCache = useCallback(() => {
    console.log('🔄 CACHE RESET: Clearing time slots cache');
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
      console.log('⚠️ PROVIDER FETCH: No selected service, skipping provider fetch');
      return;
    }

    try {
      console.log('👥 PROVIDER FETCH: Starting for:', { serviceType, date, service: selectedService });
      
      // Ensure we don't select Sundays
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) {
        console.log('⚠️ PROVIDER FETCH: Sunday selected, no providers available');
        setGroomers([]);
        return;
      }
      
      const dateStr = date.toISOString().split('T')[0];

      // Get service requirements from centralized source
      const serviceRequirements = getServiceRequirements(selectedService.id);
      console.log('📋 SERVICE REQUIREMENTS:', serviceRequirements);

      // Use the RPC function to get available providers
      const timeSlot = '09:00:00'; // Default time for checking availability
      const duration = selectedService.duration || 30;

      const { data: availableProviders, error } = await supabase.rpc('get_available_providers', {
        _service_id: selectedService.id,
        _date: dateStr,
        _time_slot: timeSlot,
        _duration: duration
      });

      console.log('📞 RPC get_available_providers result:', { availableProviders, error });

      if (error) {
        console.error('❌ PROVIDER FETCH ERROR:', error);
        setGroomers([]);
        return;
      }

      if (!availableProviders || availableProviders.length === 0) {
        console.log('⚠️ NO PROVIDERS: No providers available for this date/service');
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
        console.error('❌ USER DATA ERROR:', userError);
      }

      // Also try groomers table for names
      const { data: groomerData, error: groomerError } = await supabase
        .from('groomers')
        .select('user_id, name')
        .in('user_id', providerUserIds);

      if (groomerError) {
        console.error('❌ GROOMER DATA ERROR:', groomerError);
      }

      // Also try veterinarians table for names
      const { data: vetData, error: vetError } = await supabase
        .from('veterinarians')
        .select('user_id, name')
        .in('user_id', providerUserIds);

      if (vetError) {
        console.error('❌ VET DATA ERROR:', vetError);
      }

      // Combine all name sources
      const allUserData = [
        ...(userData || []),
        ...(groomerData || []),
        ...(vetData || [])
      ];

      console.log('📊 COMBINED USER DATA:', allUserData);

      // Map to Provider format
      const formattedProviders: Provider[] = availableProviders.map((provider: any) => {
        const userInfo = allUserData.find(u => u.user_id === provider.user_id);
        return {
          id: provider.user_id, // Use user_id for compatibility
          name: userInfo?.name || `${provider.provider_type} Provider`,
          role: provider.provider_type,
          profile_image: undefined,
          rating: 4.5, // Default rating
          specialty: provider.provider_type === 'groomer' ? 'Tosa e Banho' : 'Veterinária',
          about: `Profissional experiente em ${provider.provider_type === 'groomer' ? 'tosa e banho' : 'veterinária'}`
        };
      });

      console.log('✅ FORMATTED PROVIDERS:', formattedProviders);
      setGroomers(formattedProviders);

    } catch (error) {
      console.error('💥 PROVIDER FETCH CRITICAL ERROR:', error);
      setGroomers([]);
      toast.error('Erro ao buscar profissionais disponíveis');
    }
  }, [getServiceRequirements]);

  const fetchServices = useCallback(async (serviceType: 'grooming' | 'veterinary') => {
    try {
      console.log('📋 SERVICE FETCH: Starting for type:', serviceType);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('service_type', serviceType);

      if (error) {
        console.error('❌ SERVICE FETCH ERROR:', error);
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

      console.log('✅ SERVICES LOADED:', formattedServices);
      setServices(formattedServices);
    } catch (error) {
      console.error('💥 SERVICE FETCH CRITICAL ERROR:', error);
      toast.error('Erro ao carregar serviços');
    }
  }, []);

  const fetchUserPets = useCallback(async (userId: string) => {
    try {
      console.log('🐕 PET FETCH: Starting for user:', userId);
      
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ PET FETCH ERROR:', error);
        toast.error('Erro ao carregar pets');
        return;
      }

      const formattedPets: Pet[] = (data || []).map(pet => ({
        id: pet.id,
        name: pet.name,
        breed: pet.breed,
        age: pet.age
      }));

      console.log('✅ PETS LOADED:', formattedPets);
      setUserPets(formattedPets);
    } catch (error) {
      console.error('💥 PET FETCH CRITICAL ERROR:', error);
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
      console.log('⚠️ TIME SLOTS: Missing date or service, clearing slots');
      setTimeSlots([]);
      return;
    }

    // Check if it's Sunday
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) {
      console.log('⚠️ TIME SLOTS: Sunday selected, no slots available');
      setTimeSlots([]);
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    
    // Create unique fetch ID to prevent race conditions
    const fetchId = `${dateStr}-${groomerId}-${selectedService.id}-${Date.now()}`;
    
    // Enhanced parameter tracking to prevent unnecessary re-fetches
    const currentParams = {
      date: dateStr,
      groomerId,
      serviceId: selectedService.id,
      fetchId
    };
    
    // Only compare the functional parameters, not the fetchId
    const functionalParams = { date: dateStr, groomerId, serviceId: selectedService.id };
    const lastFunctionalParams = { 
      date: lastTimeSlotsParams.current.date, 
      groomerId: lastTimeSlotsParams.current.groomerId, 
      serviceId: lastTimeSlotsParams.current.serviceId 
    };
    
    if (JSON.stringify(lastFunctionalParams) === JSON.stringify(functionalParams)) {
      console.log('⏭️ TIME SLOTS: Skipping fetch - same functional parameters');
      return;
    }

    // Prevent double requests
    if (isFetchingTimeSlots.current) {
      console.log('⏸️ TIME SLOTS: Already fetching, skipping...');
      return;
    }
    
    lastTimeSlotsParams.current = currentParams;
    isFetchingTimeSlots.current = true;

    setIsLoading(true);
    try {
      console.log('⏰ TIME SLOTS FETCH: Starting with params:', {
        date: dateStr,
        groomerId,
        service: selectedService,
        fetchId
      });
      
      // Get service requirements from centralized source
      const serviceRequirements = getServiceRequirements(selectedService.id);
      
      if (!serviceRequirements) {
        console.log('❌ TIME SLOTS: No service requirements found');
        setTimeSlots([]);
        return;
      }

      const requiresGroomer = serviceRequirements.requires_groomer;
      const requiresShower = serviceRequirements.requires_shower;

      console.log('📋 TIME SLOTS REQUIREMENTS:', { 
        requiresGroomer, 
        requiresShower,
        combo: serviceRequirements.combo
      });

      // If service requires groomer but no groomer selected, return empty slots
      if (requiresGroomer && !groomerId) {
        console.log('⚠️ TIME SLOTS: Service requires groomer but none selected');
        setTimeSlots([]);
        return;
      }

      // Generate time slots and check availability
      const slots: TimeSlot[] = [];
      const startHour = 9;
      const endHour = 17;
      const serviceDuration = selectedService.duration || 30;

      console.log('🕒 TIME SLOTS: Generating slots from', startHour, 'to', endHour);

      for (let hour = startHour; hour < endHour; hour++) {
        for (const minutes of [0, 30]) {
          if (hour === 16 && minutes === 30) break; // Don't go past 5 PM
          
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          let isAvailable = true;
          let availabilityReason = '';

          // Check groomer availability if required
          if (requiresGroomer && groomerId) {
            const { data: providerProfile, error: profileError } = await supabase
              .from('provider_profiles')
              .select('id')
              .eq('user_id', groomerId)
              .single();

            if (profileError || !providerProfile) {
              console.error('❌ PROVIDER PROFILE ERROR:', profileError);
              isAvailable = false;
              availabilityReason = 'Provider profile not found';
            } else {
              const { data: availableProviders, error } = await supabase.rpc('get_available_providers', {
                _service_id: selectedService.id,
                _date: dateStr,
                _time_slot: timeSlot,
                _duration: serviceDuration
              });

              const providerAvailable = !error && 
                                      availableProviders && 
                                      availableProviders.some((p: any) => p.user_id === groomerId);
              
              if (!providerAvailable) {
                isAvailable = false;
                availabilityReason = 'Provider not available';
              }
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
              availabilityReason = 'Shower not available';
            }
          }

          slots.push({
            id: `${hour}:${minutes.toString().padStart(2, '0')}`,
            time: `${hour}:${minutes.toString().padStart(2, '0')}`,
            available: isAvailable
          });

          if (!isAvailable) {
            console.log(`⏰ SLOT ${timeSlot}: UNAVAILABLE (${availabilityReason})`);
          }
        }
      }

      console.log('✅ TIME SLOTS GENERATED:', {
        total: slots.length,
        available: slots.filter(s => s.available).length,
        unavailable: slots.filter(s => !s.available).length
      });
      
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
        console.log('✅ NEXT AVAILABLE SET:', { date: dateStr, time: availableSlot.time, provider: providerName });
      } else {
        setNextAvailable(null);
        console.log('❌ NO AVAILABLE SLOTS FOUND');
      }

    } catch (error) {
      console.error('💥 TIME SLOTS CRITICAL ERROR:', error);
      toast.error('Erro ao carregar horários disponíveis');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
      isFetchingTimeSlots.current = false;
      console.log('🏁 TIME SLOTS FETCH: Complete');
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
