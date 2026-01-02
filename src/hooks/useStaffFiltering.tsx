
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Service, Provider } from './useAppointmentForm';

interface StaffFilteringParams {
  service: Service | null;
  requirementsOverride?: ServiceRequirements | null;
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

export const useStaffFiltering = ({ service, requirementsOverride = null }: StaffFilteringParams) => {
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
      // Determine requirements from override or the provided service
      const requirements: ServiceRequirements = requirementsOverride ?? {
        requiresBath: !!service.requires_bath,
        requiresGrooming: !!service.requires_grooming,
        requiresVet: !!service.requires_vet
      };
      setServiceRequirements(requirements);

      // Service requirements loaded

      // Fetch all available staff via SECURITY DEFINER RPC (bypasses RLS safely)
      let allStaff: any[] | null = null;
      let staffError: any = null;
      try {
        const rpcRes = await supabase.rpc('get_available_staff_public');
        allStaff = rpcRes.data as any[] | null;
        staffError = rpcRes.error;
      } catch (e) {
        staffError = e;
      }

      if (staffError) {
        // Log full PostgREST error detail if present
        console.error('❌ [STAFF_FILTERING] Error fetching staff:', {
          message: (staffError as any)?.message,
          code: (staffError as any)?.code,
          details: (staffError as any)?.details,
          hint: (staffError as any)?.hint,
          status: (staffError as any)?.status
        });
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
          id: staff.staff_profile_id || staff.id,
          name: staff.name,
          role: 'staff', // Will be updated based on primary capability
          rating: typeof staff.avg_rating === 'number' ? staff.avg_rating : (staff.avg_rating ? Number(staff.avg_rating) : 0),
          reviewCount: typeof staff.review_count === 'number' ? staff.review_count : (staff.review_count ? Number(staff.review_count) : 0),
          about: '',
          profile_image: undefined,
          specialty: ''
        };

        // Add to bathers if can bathe and service requires bath
        if (requirements.requiresBath && staff.can_bathe === true) {
          bathers.push({
            ...staffProvider,
            role: 'bather',
            specialty: 'Banho e Higiene'
          });
        }

        // Add to groomers if can groom and service requires grooming
        if (requirements.requiresGrooming && staff.can_groom === true) {
          groomers.push({
            ...staffProvider,
            role: 'groomer',
            specialty: 'Tosa e Estética'
          });
        }

        // Add to vets if can vet and service requires vet
        if (requirements.requiresVet && staff.can_vet === true) {
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
  }, [service, requirementsOverride]);

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
