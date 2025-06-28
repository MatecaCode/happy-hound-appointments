
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pet, Service, Provider, TimeSlot, NextAvailable } from './useAppointmentForm';

export const useAppointmentData = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [nextAvailable, setNextAvailable] = useState<NextAvailable | null>(null);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [groomers, setGroomers] = useState<Provider[]>([]);

  const fetchUserPets = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setUserPets(data || []);
    } catch (error) {
      console.error('Error fetching pets:', error);
      setUserPets([]);
    }
  }, []);

  const fetchServices = useCallback(async (serviceType: 'grooming' | 'veterinary') => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('service_type', serviceType);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    }
  }, []);

  const fetchAvailableProviders = useCallback(async (
    serviceType: 'grooming' | 'veterinary',
    date: Date,
    selectedService: Service | undefined
  ) => {
    if (!selectedService) return;

    try {
      const dateStr = date.toISOString().split('T')[0];
      
      console.log('🔍 [FETCH_PROVIDERS] Starting with params:', {
        service_type: serviceType,
        service_id: selectedService.id,
        date: dateStr,
        service_name: selectedService.name
      });

      // First check if service requires a provider
      const { data: serviceResources } = await supabase
        .from('service_resources')
        .select('resource_type, provider_type')
        .eq('service_id', selectedService.id);

      const requiresProvider = serviceResources?.some(r => r.resource_type === 'provider');
      
      console.log('🔍 [FETCH_PROVIDERS] Service requirements:', {
        requires_provider: requiresProvider,
        resources: serviceResources
      });
      
      if (!requiresProvider) {
        console.log('🔍 [FETCH_PROVIDERS] Service does not require provider, skipping fetch');
        setGroomers([]);
        return;
      }

      const providerType = serviceType === 'grooming' ? 'groomer' : 'vet';
      
      // Get provider profiles that have availability on the selected date
      const { data: availableProviderData, error: availError } = await supabase
        .from('provider_availability')
        .select(`
          provider_id,
          provider_profiles!inner(
            id,
            user_id,
            type,
            bio,
            rating
          )
        `)
        .eq('date', dateStr)
        .eq('available', true)
        .eq('provider_profiles.type', providerType);

      if (availError) {
        console.error('❌ [FETCH_PROVIDERS] Error fetching available providers:', availError);
        throw availError;
      }

      console.log('📊 [FETCH_PROVIDERS] Raw available provider data:', availableProviderData);

      if (!availableProviderData || availableProviderData.length === 0) {
        console.log('❌ [FETCH_PROVIDERS] No available providers found');
        setGroomers([]);
        return;
      }

      // Get unique providers (since one provider can have multiple time slots)
      const uniqueProviders = availableProviderData.reduce((acc: any[], curr) => {
        if (!acc.find(p => p.provider_profiles.id === curr.provider_profiles.id)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      console.log('📊 [FETCH_PROVIDERS] Unique providers:', uniqueProviders);

      // Get names for these providers
      const availableProviders: Provider[] = [];
      
      for (const providerData of uniqueProviders) {
        const profile = providerData.provider_profiles;
        let providerName = 'Provider';
        
        // Get name from appropriate table
        if (providerType === 'groomer') {
          const { data: groomerData } = await supabase
            .from('groomers')
            .select('name')
            .eq('user_id', profile.user_id)
            .single();
          providerName = groomerData?.name || 'Groomer';
        } else {
          const { data: vetData } = await supabase
            .from('veterinarians')
            .select('name')
            .eq('user_id', profile.user_id)
            .single();
          providerName = vetData?.name || 'Veterinarian';
        }

        availableProviders.push({
          id: profile.user_id, // UI compatibility: use user_id as id
          provider_profile_id: profile.id, // Store actual provider_profile_id
          name: providerName,
          role: providerType,
          rating: profile.rating || 0,
          about: profile.bio || ''
        });
      }

      console.log('🎉 [FETCH_PROVIDERS] Final available providers:', {
        count: availableProviders.length,
        providers: availableProviders.map(p => ({
          id: p.id,
          provider_profile_id: p.provider_profile_id,
          name: p.name,
          role: p.role
        }))
      });

      setGroomers(availableProviders);
    } catch (error) {
      console.error('❌ [FETCH_PROVIDERS] Critical error:', error);
      setGroomers([]);
    }
  }, []);

  const fetchTimeSlots = useCallback(async (
    date: Date,
    selectedGroomerUserId: string,
    setIsLoading: (loading: boolean) => void,
    selectedService: Service | undefined
  ) => {
    if (!selectedService) return;

    console.log('⏰ [FETCH_TIME_SLOTS] Starting with params:', {
      date: date.toISOString().split('T')[0],
      selectedGroomerUserId,
      service_id: selectedService.id,
      service_duration: selectedService.duration
    });

    setIsLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if service requires provider
      const { data: serviceResources } = await supabase
        .from('service_resources')
        .select('resource_type, provider_type')
        .eq('service_id', selectedService.id);

      const requiresProvider = serviceResources?.some(r => r.resource_type === 'provider');
      const requiresShower = serviceResources?.some(r => r.resource_type === 'shower');

      console.log('📋 [FETCH_TIME_SLOTS] Service requirements:', {
        requires_provider: requiresProvider,
        requires_shower: requiresShower,
        resources: serviceResources
      });

      let providerProfileId = null;
      
      // Get provider_profile_id if provider is required
      if (requiresProvider && selectedGroomerUserId) {
        const { data: providerProfile } = await supabase
          .from('provider_profiles')
          .select('id')
          .eq('user_id', selectedGroomerUserId)
          .single();
        
        providerProfileId = providerProfile?.id;
        
        console.log('🎯 [FETCH_TIME_SLOTS] Provider ID mapping:', {
          user_id: selectedGroomerUserId,
          provider_profile_id: providerProfileId
        });
      }

      // 🔥 FIXED: Use correct RPC parameter names with underscores
      console.log('🔍 [FETCH_TIME_SLOTS] Calling RPC with CORRECTED params:', {
        _service_id: selectedService.id,
        _date: dateStr,
        _provider_id: providerProfileId
      });

      const { data: availableSlots, error } = await supabase.rpc('get_available_slots_for_service', {
        _service_id: selectedService.id,
        _date: dateStr,
        _provider_id: providerProfileId
      });

      if (error) {
        console.error('❌ [FETCH_TIME_SLOTS] RPC error:', error);
        throw error;
      }

      console.log('📊 [FETCH_TIME_SLOTS] Available slots from RPC:', availableSlots);

      // Transform to TimeSlot format
      const timeSlotData: TimeSlot[] = (availableSlots || []).map(slot => ({
        id: slot.time_slot,
        time: slot.time_slot.substring(0, 5), // Format HH:MM
        available: true
      }));

      console.log('✅ [FETCH_TIME_SLOTS] Final time slots:', timeSlotData);
      setTimeSlots(timeSlotData);

      // Fetch next available appointment
      if (timeSlotData.length === 0) {
        // If no slots today, find next available
        await fetchNextAvailable(selectedService.id, providerProfileId);
      } else {
        setNextAvailable(null);
      }

    } catch (error) {
      console.error('❌ [FETCH_TIME_SLOTS] Error:', error);
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchNextAvailable = useCallback(async (serviceId: string, providerProfileId: string | null) => {
    try {
      // Simple implementation - check next 7 days
      const today = new Date();
      for (let i = 1; i <= 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        // Skip Sundays
        if (checkDate.getDay() === 0) continue;
        
        const dateStr = checkDate.toISOString().split('T')[0];
        
        // 🔥 FIXED: Use correct RPC parameter names
        const { data: availableSlots } = await supabase.rpc('get_available_slots_for_service', {
          _service_id: serviceId,
          _date: dateStr,
          _provider_id: providerProfileId
        });

        if (availableSlots && availableSlots.length > 0) {
          setNextAvailable({
            date: dateStr,
            time: availableSlots[0].time_slot,
            provider_name: 'Próximo disponível'
          });
          return;
        }
      }
      
      setNextAvailable(null);
    } catch (error) {
      console.error('Error fetching next available:', error);
      setNextAvailable(null);
    }
  }, []);

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
