
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
      console.log('🔍 [FETCH_PROVIDERS] Starting provider fetch:', {
        serviceType,
        date: date.toISOString(),
        service: selectedService,
        service_id: selectedService.id,
        timestamp: new Date().toISOString()
      });
      
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
      console.log('📋 [FETCH_PROVIDERS] Service requirements:', serviceRequirements);

      // Use the RPC function to get available providers
      const timeSlot = '09:00:00'; // Default time for checking availability
      const duration = selectedService.duration || 30;

      console.log('📞 [FETCH_PROVIDERS] Calling get_available_providers RPC with:', {
        _service_id: selectedService.id,
        _date: dateStr,
        _time_slot: timeSlot,
        _duration: duration
      });

      const { data: availableProviders, error } = await supabase.rpc('get_available_providers', {
        _service_id: selectedService.id,
        _date: dateStr,
        _time_slot: timeSlot,
        _duration: duration
      });

      console.log('📞 [FETCH_PROVIDERS] RPC get_available_providers result:', { 
        availableProviders, 
        error,
        provider_count: availableProviders?.length || 0
      });

      if (error) {
        console.error('❌ [FETCH_PROVIDERS] RPC ERROR:', error);
        setGroomers([]);
        return;
      }

      if (!availableProviders || availableProviders.length === 0) {
        console.log('⚠️ [FETCH_PROVIDERS] No providers available for this date/service');
        setGroomers([]);
        return;
      }

      // Get user details for the providers
      const providerUserIds = availableProviders.map((p: any) => p.user_id);
      
      console.log('👥 [FETCH_PROVIDERS] Provider user IDs from RPC:', providerUserIds);

      const { data: userData, error: userError } = await supabase
        .from('clients')
        .select('user_id, name')
        .in('user_id', providerUserIds);

      if (userError) {
        console.error('❌ [FETCH_PROVIDERS] USER DATA ERROR:', userError);
      }

      // Also try groomers table for names
      const { data: groomerData, error: groomerError } = await supabase
        .from('groomers')
        .select('user_id, name')
        .in('user_id', providerUserIds);

      if (groomerError) {
        console.error('❌ [FETCH_PROVIDERS] GROOMER DATA ERROR:', groomerError);
      }

      // Also try veterinarians table for names
      const { data: vetData, error: vetError } = await supabase
        .from('veterinarians')
        .select('user_id, name')
        .in('user_id', providerUserIds);

      if (vetError) {
        console.error('❌ [FETCH_PROVIDERS] VET DATA ERROR:', vetError);
      }

      // Combine all name sources
      const allUserData = [
        ...(userData || []),
        ...(groomerData || []),
        ...(vetData || [])
      ];

      console.log('📊 [FETCH_PROVIDERS] Combined user data:', allUserData);

      // CRITICAL: Map to Provider format - store BOTH user_id and provider_profile_id
      const formattedProviders: Provider[] = availableProviders.map((provider: any) => {
        const userInfo = allUserData.find(u => u.user_id === provider.user_id);
        const mappedProvider = {
          id: provider.user_id, // Keep user_id for UI compatibility
          name: userInfo?.name || `${provider.provider_type} Provider`,
          role: provider.provider_type,
          profile_image: undefined,
          rating: 4.5,
          specialty: provider.provider_type === 'groomer' ? 'Tosa e Banho' : 'Veterinária',
          about: `Profissional experiente em ${provider.provider_type === 'groomer' ? 'tosa e banho' : 'veterinária'}`,
          provider_profile_id: provider.provider_id // Store the actual provider_profile_id
        };
        
        console.log('🎯 [FETCH_PROVIDERS] Mapped provider:', {
          original: provider,
          mapped: mappedProvider,
          user_id: provider.user_id,
          provider_profile_id: provider.provider_id
        });
        
        return mappedProvider;
      });

      console.log('✅ [FETCH_PROVIDERS] Final formatted providers:', formattedProviders);
      setGroomers(formattedProviders);

    } catch (error) {
      console.error('💥 [FETCH_PROVIDERS] CRITICAL ERROR:', error);
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

  // SIMPLIFIED TIME SLOT LOGIC - Only show slots that the selected groomer has available
  const fetchTimeSlots = useCallback(async (
    date: Date | undefined,
    groomerUserId: string | null,
    setIsLoading: (loading: boolean) => void,
    selectedService?: Service
  ) => {
    if (!date || !selectedService) {
      console.log('⚠️ [FETCH_TIMESLOTS] Missing date or service, clearing slots');
      setTimeSlots([]);
      return;
    }

    // Check if it's Sunday
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) {
      console.log('⚠️ [FETCH_TIMESLOTS] Sunday selected, no slots available');
      setTimeSlots([]);
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    
    // Get service requirements
    const serviceRequirements = getServiceRequirements(selectedService.id);
    if (!serviceRequirements) {
      console.log('❌ [FETCH_TIMESLOTS] No service requirements found');
      setTimeSlots([]);
      return;
    }

    const requiresGroomer = serviceRequirements.requires_groomer;
    
    console.log('🔍 [FETCH_TIMESLOTS] Starting time slot fetch:', {
      date: dateStr,
      groomer_user_id: groomerUserId,
      service_id: selectedService.id,
      requires_groomer: requiresGroomer,
      service_requirements: serviceRequirements,
      timestamp: new Date().toISOString()
    });

    // If service requires groomer but none selected, show no slots
    if (requiresGroomer && !groomerUserId) {
      console.log('⚠️ [FETCH_TIMESLOTS] Service requires groomer but none selected');
      setTimeSlots([]);
      return;
    }

    setIsLoading(true);
    
    try {
      let providerProfileId: string | null = null;
      
      // If groomer is required, get their provider_profile_id
      if (requiresGroomer && groomerUserId) {
        const selectedGroomer = groomers.find(g => g.id === groomerUserId);
        providerProfileId = (selectedGroomer as any)?.provider_profile_id || null;
        
        console.log('🎯 [FETCH_TIMESLOTS] Provider profile ID mapping:', { 
          groomer_user_id: groomerUserId, 
          provider_profile_id: providerProfileId,
          selected_groomer: selectedGroomer,
          all_groomers: groomers.map(g => ({ id: g.id, provider_profile_id: (g as any).provider_profile_id }))
        });

        if (!providerProfileId) {
          console.error('❌ [FETCH_TIMESLOTS] No provider_profile_id found for groomer:', groomerUserId);
          setTimeSlots([]);
          setIsLoading(false);
          return;
        }
      }

      // Get only the available slots for this specific provider
      const { data: availableSlots, error } = await supabase
        .from('provider_availability')
        .select('time_slot, available')
        .eq('provider_id', providerProfileId)
        .eq('date', dateStr)
        .eq('available', true)
        .order('time_slot');

      console.log('📊 [FETCH_TIMESLOTS] Provider availability result:', {
        data: availableSlots,
        error: error,
        provider_profile_id: providerProfileId,
        date: dateStr
      });

      if (error) {
        console.error('❌ [FETCH_TIMESLOTS] Provider availability error:', error);
        setTimeSlots([]);
        setIsLoading(false);
        return;
      }

      if (!availableSlots || availableSlots.length === 0) {
        console.log('⚠️ [FETCH_TIMESLOTS] No available slots found for this provider/date');
        setTimeSlots([]);
        setIsLoading(false);
        return;
      }

      // Convert database time slots to UI format
      const slots: TimeSlot[] = availableSlots.map(slot => {
        const timeStr = slot.time_slot.substring(0, 5); // Convert "09:00:00" to "09:00"
        return {
          id: timeStr,
          time: timeStr,
          available: true // All slots from query are available
        };
      });

      console.log('✅ [FETCH_TIMESLOTS] Time slots generation complete:', {
        total: slots.length,
        slots_summary: slots.map(s => ({ time: s.time, available: s.available }))
      });
      
      setTimeSlots(slots);

      // Set next available
      const availableSlot = slots[0]; // First slot is next available
      if (availableSlot) {
        const providerName = requiresGroomer && groomerUserId 
          ? groomers.find(g => g.id === groomerUserId)?.name || 'Profissional'
          : 'Banho Disponível';
        setNextAvailable({
          date: dateStr,
          time: availableSlot.time,
          provider_name: providerName
        });
        console.log('🎯 [FETCH_TIMESLOTS] Next available set:', { date: dateStr, time: availableSlot.time, provider_name: providerName });
      } else {
        setNextAvailable(null);
        console.log('⚠️ [FETCH_TIMESLOTS] No available slots found');
      }

    } catch (error) {
      console.error('💥 [FETCH_TIMESLOTS] CRITICAL ERROR:', error);
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
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
