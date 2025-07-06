
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pet, Service, TimeSlot, NextAvailable } from './useAppointmentForm';

// Define Provider interface for Phase 1 - using staff_profiles
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
        service_name: selectedService.name,
        requires_grooming: selectedService.requires_grooming,
        requires_vet: selectedService.requires_vet,
        requires_bath: selectedService.requires_bath
      });

      // Check if service requires staff
      const requiresStaff = selectedService.requires_grooming || selectedService.requires_vet || selectedService.requires_bath;
      
      if (!requiresStaff) {
        console.log('🔍 [FETCH_PROVIDERS] Service does not require staff, skipping fetch');
        setGroomers([]);
        return;
      }

      // Build query for staff_profiles based on service requirements
      let staffQuery = supabase
        .from('staff_profiles')
        .select('id, name, can_groom, can_vet, can_bathe, bio')
        .eq('active', true);

      // Filter staff based on service requirements
      if (selectedService.requires_grooming) {
        staffQuery = staffQuery.eq('can_groom', true);
      }
      if (selectedService.requires_vet) {
        staffQuery = staffQuery.eq('can_vet', true);
      }
      if (selectedService.requires_bath) {
        staffQuery = staffQuery.eq('can_bathe', true);
      }

      const { data: qualifiedStaff, error: staffError } = await staffQuery;

      if (staffError) {
        console.error('❌ [FETCH_PROVIDERS] Error fetching qualified staff:', staffError);
        throw staffError;
      }

      console.log('📊 [FETCH_PROVIDERS] Qualified staff found:', qualifiedStaff?.length || 0);

      if (!qualifiedStaff || qualifiedStaff.length === 0) {
        console.log('❌ [FETCH_PROVIDERS] No qualified staff found');
        setGroomers([]);
        return;
      }

      // Now check availability for each qualified staff member
      const availableProviders: Provider[] = [];

      for (const staff of qualifiedStaff) {
        // Check if staff has availability on the selected date
        const { data: availability } = await supabase
          .from('staff_availability')
          .select('time_slot, available')
          .eq('staff_profile_id', staff.id)
          .eq('date', dateStr)
          .eq('available', true);

        if (availability && availability.length > 0) {
          availableProviders.push({
            id: staff.id,
            name: staff.name,
            role: staff.can_vet ? 'vet' : (staff.can_groom ? 'groomer' : 'bather'),
            rating: 4.5, // Default rating for now
            about: staff.bio || ''
          });
        }
      }

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
    selectedStaffProfileId: string | null,
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
    setTimeSlots([]);
    
    try {
      const dateStr = date.toISOString().split('T')[0];
      const serviceDuration = selectedService.default_duration || 60;
      
      // Generate time slots from 9:00 to 17:00 in 30-minute intervals
      const availableSlots: TimeSlot[] = [];
      
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          const startTime = new Date(`1970-01-01T${timeStr}`);
          const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
          
          // Skip if appointment would end after 5 PM
          if (endTime.getHours() > 17 || (endTime.getHours() === 17 && endTime.getMinutes() > 0)) {
            continue;
          }
          
          let isAvailable = true;
          
          // Check staff availability for entire service duration if staff is required
          if (selectedStaffProfileId && (selectedService.requires_grooming || selectedService.requires_vet || selectedService.requires_bath)) {
            // Check availability for every 30-minute slot needed for the service duration
            for (let offset = 0; offset < serviceDuration; offset += 30) {
              const checkTime = new Date(startTime.getTime() + offset * 60000);
              const checkTimeStr = `${checkTime.getHours().toString().padStart(2, '0')}:${checkTime.getMinutes().toString().padStart(2, '0')}:00`;
              
              const { data: staffAvailability } = await supabase
                .from('staff_availability')
                .select('available')
                .eq('staff_profile_id', selectedStaffProfileId)
                .eq('date', dateStr)
                .eq('time_slot', checkTimeStr)
                .eq('available', true)
                .maybeSingle();
                
              if (!staffAvailability) {
                isAvailable = false;
                break;
              }
            }
          }
          
          if (isAvailable) {
            availableSlots.push({
              id: timeStr,
              time: timeStr.substring(0, 5), // Format HH:MM
              available: true
            });
          }
        }
      }

      console.log('✅ [FETCH_TIME_SLOTS] Final time slots:', {
        count: availableSlots.length,
        slots: availableSlots.map(s => ({ id: s.id, time: s.time }))
      });
      
      setTimeSlots(availableSlots);

      // Fetch next available appointment if no slots today
      if (availableSlots.length === 0 && selectedStaffProfileId) {
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

  const fetchNextAvailable = useCallback(async (serviceId: string, staffProfileId: string) => {
    try {
      // Simple implementation - check next 7 days
      const today = new Date();
      for (let i = 1; i <= 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        // Skip Sundays
        if (checkDate.getDay() === 0) continue;
        
        const dateStr = checkDate.toISOString().split('T')[0];
        
        // Check if there are any available slots for this date and staff
        const { data: availableSlots } = await supabase
          .from('staff_availability')
          .select('time_slot')
          .eq('staff_profile_id', staffProfileId)
          .eq('date', dateStr)
          .eq('available', true)
          .limit(1);

        if (availableSlots && availableSlots.length > 0) {
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
