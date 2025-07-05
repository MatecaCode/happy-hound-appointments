
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pet, Service, TimeSlot, NextAvailable } from './useAppointmentForm';

// Define Provider interface locally since it's not exported from useAppointmentForm
interface Provider {
  id: string;
  name: string;
  role: string;
  rating: number;
  about: string;
}

export const useAppointmentData = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [nextAvailable, setNextAvailable] = useState<NextAvailable | null>(null);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [groomers, setGroomers] = useState<Provider[]>([]);

  const fetchUserPets = useCallback(async (userId: string) => {
    try {
      // Get client_id from user_id first
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (clientError || !clientData) {
        console.log('No client record found for user:', userId);
        setUserPets([]);
        return;
      }

      // Now get pets using client_id
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('client_id', clientData.id)
        .eq('active', true);

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
        .eq('service_type', serviceType)
        .eq('active', true);

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

      // Check if service requires staff (Phase 1)
      const requiresStaff = selectedService.requires_grooming || selectedService.requires_vet;
      
      console.log('🔍 [FETCH_PROVIDERS] Service requirements:', {
        requires_staff: requiresStaff,
        requires_grooming: selectedService.requires_grooming,
        requires_vet: selectedService.requires_vet
      });
      
      if (!requiresStaff) {
        console.log('🔍 [FETCH_PROVIDERS] Service does not require staff, skipping fetch');
        setGroomers([]);
        return;
      }

      // Get available staff manually since RPC doesn't exist
      const { data: availableStaff, error: staffError } = await supabase
        .from('staff_profiles')
        .select(`
          id,
          name,
          can_groom,
          can_vet,
          can_bathe,
          staff_availability!inner(available)
        `)
        .eq('active', true)
        .eq('staff_availability.date', dateStr)
        .eq('staff_availability.available', true);

      if (staffError) {
        console.error('❌ [FETCH_PROVIDERS] Error fetching available staff:', staffError);
        throw staffError;
      }

      console.log('📊 [FETCH_PROVIDERS] Raw available staff data:', availableStaff);

      if (!availableStaff || availableStaff.length === 0) {
        console.log('❌ [FETCH_PROVIDERS] No available staff found');
        setGroomers([]);
        return;
      }

      // Filter staff based on service requirements and transform to Provider format
      const availableProviders: Provider[] = availableStaff
        .filter(staff => {
          if (selectedService.requires_grooming && !staff.can_groom) return false;
          if (selectedService.requires_vet && !staff.can_vet) return false;
          return true;
        })
        .map(staff => ({
          id: staff.id,
          name: staff.name,
          role: staff.can_vet ? 'vet' : (staff.can_groom ? 'groomer' : 'bather'),
          rating: 0, // Default rating
          about: '' // Default empty about
        }));

      console.log('🎉 [FETCH_PROVIDERS] Final available providers:', {
        count: availableProviders.length,
        providers: availableProviders.map(p => ({
          id: p.id,
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
    selectedStaffProfileId: string,
    setIsLoading: (loading: boolean) => void,
    selectedService: Service | undefined
  ) => {
    if (!selectedService) return;

    console.log('⏰ [FETCH_TIME_SLOTS] Starting with params:', {
      date: date.toISOString().split('T')[0],
      selectedStaffProfileId,
      service_id: selectedService.id,
      service_duration: selectedService.default_duration
    });

    setIsLoading(true);
    
    // Reset slots immediately to prevent stale data
    setTimeSlots([]);
    
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // Use existing RPC function with correct parameters
      const rpcParams = {
        _service_id: selectedService.id,
        _date: dateStr,
        _provider_id: selectedStaffProfileId || null
      };

      console.log('📤 [FETCH_TIME_SLOTS] 🔥 CALLING get_available_slots_for_service RPC with params:', {
        ...rpcParams,
        service_name: selectedService.name,
        service_duration_minutes: selectedService.default_duration,
        timestamp: new Date().toISOString()
      });

      const { data: availableSlots, error } = await supabase.rpc('get_available_slots_for_service', rpcParams);

      if (error) {
        console.error('❌ [FETCH_TIME_SLOTS] RPC error:', error);
        throw error;
      }

      console.log('📨 [FETCH_TIME_SLOTS] 🔥 RPC RESPONSE from get_available_slots_for_service:', {
        slots_count: Array.isArray(availableSlots) ? availableSlots.length : 0,
        slots: availableSlots,
        request_params: rpcParams,
        timestamp: new Date().toISOString()
      });

      if (!availableSlots || !Array.isArray(availableSlots)) {
        console.error('❌ [FETCH_TIME_SLOTS] Invalid slots response:', availableSlots);
        setTimeSlots([]);
        return;
      }

      // Transform to TimeSlot format
      const timeSlotData: TimeSlot[] = availableSlots.map(slot => ({
        id: slot.time_slot,
        time: slot.time_slot.substring(0, 5), // Format HH:MM
        available: true
      }));

      console.log('✅ [FETCH_TIME_SLOTS] Final time slots for UI:', {
        count: timeSlotData.length,
        slots: timeSlotData.map(s => ({ id: s.id, time: s.time, available: s.available })),
        timestamp: new Date().toISOString()
      });
      
      setTimeSlots(timeSlotData);

      // Fetch next available appointment if no slots today
      if (timeSlotData.length === 0) {
        await fetchNextAvailable(selectedService.id, selectedStaffProfileId);
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

  const fetchNextAvailable = useCallback(async (serviceId: string, staffProfileId: string | null) => {
    try {
      // Simple implementation - check next 7 days
      const today = new Date();
      for (let i = 1; i <= 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        // Skip Sundays
        if (checkDate.getDay() === 0) continue;
        
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const { data: availableSlots } = await supabase.rpc('get_available_slots_for_service', {
          _service_id: serviceId,
          _date: dateStr,
          _provider_id: staffProfileId
        });

        if (availableSlots && Array.isArray(availableSlots) && availableSlots.length > 0) {
          setNextAvailable({
            date: dateStr,
            time: availableSlots[0].time_slot,
            staff_name: 'Próximo disponível'
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
