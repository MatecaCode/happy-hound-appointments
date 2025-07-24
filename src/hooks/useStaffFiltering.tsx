
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Service, Provider } from './useAppointmentForm';

interface StaffFilteringParams {
  service: Service | null;
}

export interface StaffByRole {
  bathers: Provider[];
  groomers: Provider[];
  vets: Provider[];
}

export interface ServiceRequirements {
  requiresBath: boolean;
  requiresGrooming: boolean;
  requiresVet: boolean;
}

export const useStaffFiltering = ({ service }: StaffFilteringParams) => {
  const [staffByRole, setStaffByRole] = useState<StaffByRole>({
    bathers: [],
    groomers: [],
    vets: []
  });
  const [serviceRequirements, setServiceRequirements] = useState<ServiceRequirements>({
    requiresBath: false,
    requiresGrooming: false,
    requiresVet: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffByRole = useCallback(async () => {
    if (!service) {
      setStaffByRole({ bathers: [], groomers: [], vets: [] });
      setServiceRequirements({ requiresBath: false, requiresGrooming: false, requiresVet: false });
      return;
    }

    // Starting staff filtering

    setIsLoading(true);
    setError(null);

    try {
      // Set service requirements
      const requirements = {
        requiresBath: service.requires_bath || false,
        requiresGrooming: service.requires_grooming || false,
        requiresVet: service.requires_vet || false
      };
      setServiceRequirements(requirements);

      // Service requirements loaded

      // Fetch all active staff
      const { data: allStaff, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id, name, can_groom, can_vet, can_bathe, bio, photo_url, hourly_rate')
        .eq('active', true);

      if (staffError) {
        console.error('❌ [STAFF_FILTERING] Error fetching staff:', staffError);
        throw staffError;
      }

      if (!allStaff || allStaff.length === 0) {
        // No active staff found
        setError('No active staff members found');
        return;
      }

      // Separate staff by role capabilities
      const bathers: Provider[] = [];
      const groomers: Provider[] = [];
      const vets: Provider[] = [];

      allStaff.forEach(staff => {
        const staffProvider: Provider = {
          id: staff.id,
          name: staff.name,
          role: 'staff', // Will be updated based on primary capability
          rating: 4.5, // Default rating
          about: staff.bio || '',
          profile_image: staff.photo_url || undefined,
          specialty: ''
        };

        // Add to bathers if can bathe and service requires bath
        if (staff.can_bathe && requirements.requiresBath) {
          bathers.push({
            ...staffProvider,
            role: 'bather',
            specialty: 'Banho e Higiene'
          });
        }

        // Add to groomers if can groom and service requires grooming
        if (staff.can_groom && requirements.requiresGrooming) {
          groomers.push({
            ...staffProvider,
            role: 'groomer',
            specialty: 'Tosa e Estética'
          });
        }

        // Add to vets if can vet and service requires vet
        if (staff.can_vet && requirements.requiresVet) {
          vets.push({
            ...staffProvider,
            role: 'vet',
            specialty: 'Cuidados Veterinários'
          });
        }
      });

      // Staff filtering completed

      setStaffByRole({ bathers, groomers, vets });

      // Check if we have staff for all required roles
      if (requirements.requiresBath && bathers.length === 0) {
        setError('Nenhum banhista disponível para este serviço');
        return;
      }
      if (requirements.requiresGrooming && groomers.length === 0) {
        setError('Nenhum tosador disponível para este serviço');
        return;
      }
      if (requirements.requiresVet && vets.length === 0) {
        setError('Nenhum veterinário disponível para este serviço');
        return;
      }

    } catch (error) {
      console.error('❌ [STAFF_FILTERING] Critical error:', error);
      setError('Falha ao carregar profissionais disponíveis. Tente novamente.');
      setStaffByRole({ bathers: [], groomers: [], vets: [] });
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    fetchStaffByRole();
  }, [fetchStaffByRole]);

  return {
    staffByRole,
    serviceRequirements,
    isLoading,
    error,
    refetch: fetchStaffByRole
  };
};
