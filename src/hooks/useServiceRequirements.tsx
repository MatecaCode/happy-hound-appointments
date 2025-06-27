
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceRequirements {
  service_id: string;
  service_name: string;
  service_type: string;
  requires_shower: boolean;
  requires_groomer: boolean;
  requires_vet: boolean;
  combo: 'groomer+shower' | 'vet' | 'groomer' | 'shower' | 'none';
  required_resource_count: number;
  required_resources: string[];
}

export const useServiceRequirements = () => {
  const [serviceRequirements, setServiceRequirements] = useState<ServiceRequirements[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchServiceRequirements = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to query the view directly first
      const { data: viewData, error: viewError } = await supabase
        .from('vw_service_requirements')
        .select('*')
        .order('service_name');

      if (!viewError && viewData) {
        // Map the view data to our interface
        const mappedData: ServiceRequirements[] = viewData.map((item: any) => ({
          service_id: item.service_id,
          service_name: item.service_name,
          service_type: item.service_type,
          requires_shower: item.requires_shower,
          requires_groomer: item.requires_groomer,
          requires_vet: item.requires_vet,
          combo: item.combo,
          required_resource_count: item.required_resource_count,
          required_resources: item.required_resources || []
        }));
        setServiceRequirements(mappedData);
        return;
      }

      // Fallback to direct query with proper typing
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('services')
        .select(`
          id,
          name,
          service_type,
          service_resources (
            resource_type,
            provider_type,
            required
          )
        `);

      if (fallbackError) {
        console.error('Error fetching service requirements:', fallbackError);
        toast.error('Erro ao carregar requisitos dos serviços');
        return;
      }

      // Transform the data to match our interface
      const transformedData: ServiceRequirements[] = (fallbackData || []).map(service => {
        const resources = service.service_resources || [];
        const requiresShower = resources.some(r => r.resource_type === 'shower' && r.required);
        const requiresGroomer = resources.some(r => r.resource_type === 'provider' && r.provider_type === 'groomer' && r.required);
        const requiresVet = resources.some(r => r.resource_type === 'provider' && r.provider_type === 'vet' && r.required);
        
        let combo: ServiceRequirements['combo'] = 'none';
        if (requiresGroomer && requiresShower) combo = 'groomer+shower';
        else if (requiresVet) combo = 'vet';
        else if (requiresGroomer) combo = 'groomer';
        else if (requiresShower) combo = 'shower';

        const requiredResources = resources
          .filter(r => r.required)
          .map(r => r.resource_type === 'provider' ? r.provider_type : r.resource_type)
          .filter(Boolean);

        return {
          service_id: service.id,
          service_name: service.name,
          service_type: service.service_type,
          requires_shower: requiresShower,
          requires_groomer: requiresGroomer,
          requires_vet: requiresVet,
          combo,
          required_resource_count: requiredResources.length,
          required_resources: requiredResources
        };
      });

      setServiceRequirements(transformedData);

    } catch (error) {
      console.error('Error in fetchServiceRequirements:', error);
      toast.error('Erro ao carregar requisitos dos serviços');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getServiceRequirements = useCallback((serviceId: string): ServiceRequirements | null => {
    return serviceRequirements.find(req => req.service_id === serviceId) || null;
  }, [serviceRequirements]);

  const getRequirementsForServices = useCallback((serviceIds: string[]): ServiceRequirements[] => {
    return serviceRequirements.filter(req => serviceIds.includes(req.service_id));
  }, [serviceRequirements]);

  useEffect(() => {
    fetchServiceRequirements();
  }, [fetchServiceRequirements]);

  return {
    serviceRequirements,
    isLoading,
    fetchServiceRequirements,
    getServiceRequirements,
    getRequirementsForServices,
  };
};
