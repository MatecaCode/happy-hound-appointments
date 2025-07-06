
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Service, Provider } from './useAppointmentForm';

interface StaffFilteringParams {
  service: Service | null;
  date: Date | undefined;
  serviceDuration: number;
}

export const useStaffFiltering = ({ service, date, serviceDuration }: StaffFilteringParams) => {
  const [availableStaff, setAvailableStaff] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableStaff = useCallback(async () => {
    if (!service || !date) {
      setAvailableStaff([]);
      return;
    }

    console.log('🔍 [STAFF_FILTERING] Starting staff filtering:', {
      service: service.name,
      date: date.toISOString().split('T')[0],
      duration: serviceDuration,
      requirements: {
        grooming: service.requires_grooming,
        vet: service.requires_vet,
        bath: service.requires_bath
      }
    });

    setIsLoading(true);
    setError(null);

    try {
      const dateStr = date.toISOString().split('T')[0];

      // Step 1: Get qualified staff based on service requirements
      let staffQuery = supabase
        .from('staff_profiles')
        .select('id, name, can_groom, can_vet, can_bathe, bio, photo_url, hourly_rate')
        .eq('active', true);

      // Apply capability filters based on service requirements
      if (service.requires_grooming) {
        staffQuery = staffQuery.eq('can_groom', true);
      }
      if (service.requires_vet) {
        staffQuery = staffQuery.eq('can_vet', true);
      }
      if (service.requires_bath) {
        staffQuery = staffQuery.eq('can_bathe', true);
      }

      const { data: qualifiedStaff, error: staffError } = await staffQuery;

      if (staffError) {
        console.error('❌ [STAFF_FILTERING] Error fetching qualified staff:', staffError);
        throw staffError;
      }

      console.log('📊 [STAFF_FILTERING] Qualified staff found:', qualifiedStaff?.length || 0);

      if (!qualifiedStaff || qualifiedStaff.length === 0) {
        console.log('❌ [STAFF_FILTERING] No qualified staff found');
        setAvailableStaff([]);
        setError('No staff members meet the requirements for this service');
        return;
      }

      // Step 2: Check availability for each qualified staff member
      const availableStaffMembers: Provider[] = [];

      for (const staff of qualifiedStaff) {
        console.log(`🔍 [STAFF_FILTERING] Checking availability for ${staff.name} (${staff.id})`);
        
        // Generate time slots needed for the service duration
        const slotsNeeded = Math.ceil(serviceDuration / 30); // 30-minute intervals
        let allSlotsAvailable = true;

        // Check each 30-minute slot needed for the service
        for (let i = 0; i < slotsNeeded; i++) {
          const slotTime = new Date(`1970-01-01T09:00:00`);
          slotTime.setMinutes(slotTime.getMinutes() + (i * 30));
          const timeSlot = slotTime.toTimeString().split(' ')[0];

          const { data: availability, error: availError } = await supabase
            .from('staff_availability')
            .select('available')
            .eq('staff_profile_id', staff.id)
            .eq('date', dateStr)
            .eq('time_slot', timeSlot)
            .eq('available', true)
            .maybeSingle();

          if (availError || !availability) {
            console.log(`❌ [STAFF_FILTERING] ${staff.name} not available at ${timeSlot}`);
            allSlotsAvailable = false;
            break;
          }
        }

        if (allSlotsAvailable) {
          console.log(`✅ [STAFF_FILTERING] ${staff.name} is fully available`);
          
          // Determine role based on capabilities
          let role = 'staff';
          if (staff.can_vet) role = 'vet';
          else if (staff.can_groom) role = 'groomer';
          else if (staff.can_bathe) role = 'bather';

          availableStaffMembers.push({
            id: staff.id,
            name: staff.name,
            role: role,
            rating: 4.5, // Default rating - can be enhanced later
            about: staff.bio || '',
            profile_image: staff.photo_url,
            specialty: role === 'vet' ? 'Veterinary Care' : 
                     role === 'groomer' ? 'Pet Grooming' : 'Pet Care'
          });
        }
      }

      console.log('🎉 [STAFF_FILTERING] Final available staff:', {
        count: availableStaffMembers.length,
        staff: availableStaffMembers.map(s => ({ id: s.id, name: s.name, role: s.role }))
      });

      setAvailableStaff(availableStaffMembers);

      if (availableStaffMembers.length === 0) {
        setError('No staff members are available for the selected date and service');
      }

    } catch (error) {
      console.error('❌ [STAFF_FILTERING] Critical error:', error);
      setError('Failed to load available staff. Please try again.');
      setAvailableStaff([]);
    } finally {
      setIsLoading(false);
    }
  }, [service, date, serviceDuration]);

  useEffect(() => {
    fetchAvailableStaff();
  }, [fetchAvailableStaff]);

  return {
    availableStaff,
    isLoading,
    error,
    refetch: fetchAvailableStaff
  };
};
