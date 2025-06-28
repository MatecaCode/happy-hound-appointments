
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

      // SIMPLIFIED: Map to Provider format - store BOTH user_id and provider_profile_id
      const formattedProviders: Provider[] = availableProviders.map((provider: any) => {
        const userInfo = allUserData.find(u => u.user_id === provider.user_id);
        return {
          id: provider.user_id, // Keep user_id for UI compatibility
          name: userInfo?.name || `${provider.provider_type} Provider`,
          role: provider.provider_type,
          profile_image: undefined,
          rating: 4.5,
          specialty: provider.provider_type === 'groomer' ? 'Tosa e Banho' : 'Veterinária',
          about: `Profissional experiente em ${provider.provider_type === 'groomer' ? 'tosa e banho' : 'veterinária'}`,
          provider_profile_id: provider.provider_id // Store the actual provider_profile_id
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

  // SIMPLIFIED TIME SLOT LOGIC: If groomer was selected, they're already validated as available
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
    
    // Get service requirements
    const serviceRequirements = getServiceRequirements(selectedService.id);
    if (!serviceRequirements) {
      console.log('❌ TIME SLOTS: No service requirements found');
      setTimeSlots([]);
      return;
    }

    const requiresGroomer = serviceRequirements.requires_groomer;
    
    // SIMPLIFIED LOGIC: If groomer is required and selected, just get their availability
    // If groomer is not required, get shower availability only
    
    console.log('⏰ SIMPLIFIED TIME SLOTS: Generating based on requirements:', {
      requiresGroomer,
      groomerId,
      date: dateStr
    });

    setIsLoading(true);
    
    try {
      const slots: TimeSlot[] = [];
      const startHour = 9;
      const endHour = 17;

      let providerProfileId: string | null = null;
      
      // If groomer is required, get their provider_profile_id
      if (requiresGroomer && groomerId) {
        const selectedGroomer = groomers.find(g => g.id === groomerId);
        providerProfileId = (selectedGroomer as any)?.provider_profile_id || null;
        
        console.log('🔍 PROVIDER PROFILE ID:', { 
          user_id: groomerId, 
          provider_profile_id: providerProfileId 
        });
      }

      // Generate time slots and check availability
      for (let hour = startHour; hour < endHour; hour++) {
        for (const minutes of [0, 30]) {
          if (hour === 16 && minutes === 30) break;
          
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          let isAvailable = true;

          // Check provider availability if required
          if (requiresGroomer && providerProfileId) {
            const { data: providerAvail } = await supabase
              .from('provider_availability')
              .select('available')
              .eq('provider_id', providerProfileId)
              .eq('date', dateStr)
              .eq('time_slot', timeSlot)
              .single();
            
            if (!providerAvail?.available) {
              isAvailable = false;
            }
          }

          // Check shower availability if required
          if (serviceRequirements.requires_shower && isAvailable) {
            const { data: showerAvail } = await supabase
              .from('shower_availability')
              .select('available_spots')
              .eq('date', dateStr)
              .eq('time_slot', timeSlot)
              .single();
            
            if (!showerAvail || showerAvail.available_spots <= 0) {
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

      console.log('✅ TIME SLOTS GENERATED:', {
        total: slots.length,
        available: slots.filter(s => s.available).length
      });
      
      setTimeSlots(slots);

      // Set next available
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
      console.error('💥 TIME SLOTS ERROR:', error);
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
