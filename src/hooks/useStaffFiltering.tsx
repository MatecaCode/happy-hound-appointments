
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Service, Provider } from './useAppointmentForm';

interface StaffFilteringParams {
  service: Service | null;
  date?: Date | undefined; // Make date optional since staff selection comes first
  serviceDuration?: number;
}

export const useStaffFiltering = ({ service, date, serviceDuration }: StaffFilteringParams) => {
  const [availableStaff, setAvailableStaff] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableStaff = useCallback(async () => {
    if (!service) {
      setAvailableStaff([]);
      return;
    }

    console.log('🔍 [STAFF_FILTERING] Starting staff filtering for service:', {
      service: service.name,
      requirements: {
        grooming: service.requires_grooming,
        vet: service.requires_vet,
        bath: service.requires_bath
      }
    });

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get qualified staff based on service requirements (no date filtering yet)
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

      // Convert to Provider format
      const staffMembers: Provider[] = qualifiedStaff.map(staff => {
        // Determine role based on capabilities
        let role = 'staff';
        if (staff.can_vet) role = 'vet';
        else if (staff.can_groom) role = 'groomer';
        else if (staff.can_bathe) role = 'bather';

        return {
          id: staff.id,
          name: staff.name,
          role: role,
          rating: 4.5, // Default rating - can be enhanced later
          about: staff.bio || '',
          profile_image: staff.photo_url || undefined,
          specialty: role === 'vet' ? 'Veterinary Care' : 
                   role === 'groomer' ? 'Pet Grooming' : 'Pet Care'
        };
      });

      console.log('🎉 [STAFF_FILTERING] Available staff (all qualified):', {
        count: staffMembers.length,
        staff: staffMembers.map(s => ({ id: s.id, name: s.name, role: s.role }))
      });

      setAvailableStaff(staffMembers);

    } catch (error) {
      console.error('❌ [STAFF_FILTERING] Critical error:', error);
      setError('Failed to load available staff. Please try again.');
      setAvailableStaff([]);
    } finally {
      setIsLoading(false);
    }
  }, [service]); // Remove date dependency since staff selection comes first

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
