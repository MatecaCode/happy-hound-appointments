
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
      const { data, error } = await supabase
        .from('vw_service_requirements')
        .select('*')
        .order('service_name');

      if (error) {
        console.error('Error fetching service requirements:', error);
        toast.error('Erro ao carregar requisitos dos serviços');
        return;
      }

      setServiceRequirements(data || []);
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
