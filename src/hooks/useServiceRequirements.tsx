
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServiceRequirements {
  requires_bath: boolean;
  requires_grooming: boolean;
  requires_vet: boolean;
  service_type: string;
  default_duration: number;
  base_price: number;
}

export const useServiceRequirements = () => {
  const [serviceRequirements, setServiceRequirements] = useState<Record<string, ServiceRequirements>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all service requirements on mount
  useEffect(() => {
    loadAllServiceRequirements();
  }, []);

  const loadAllServiceRequirements = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Loading service requirements
      
      // Updated for Phase 1: Get requirements directly from services table
      const { data: services, error } = await supabase
        .from('services')
        .select(`
          id,
          requires_bath,
          requires_grooming,
          requires_vet,
          service_type,
          default_duration,
          base_price
        `)
        .eq('active', true);

      if (error) {
        console.error('❌ [SERVICE_REQUIREMENTS] Error loading requirements:', error);
        throw error;
      }

      // Services data loaded

      // Build requirements map
      const requirementsMap: Record<string, ServiceRequirements> = {};
      
      services?.forEach(service => {
        requirementsMap[service.id] = {
          requires_bath: service.requires_bath || false,
          requires_grooming: service.requires_grooming || false,
          requires_vet: service.requires_vet || false,
          service_type: service.service_type,
          default_duration: service.default_duration || 30,
          base_price: service.base_price || 0
        };
      });

      // Requirements map built
      setServiceRequirements(requirementsMap);
      
    } catch (err: any) {
      console.error('💥 [SERVICE_REQUIREMENTS] Critical error:', err);
      setError(err.message || 'Failed to load service requirements');
    } finally {
      setIsLoading(false);
    }
  };

  const getServiceRequirements = (serviceId: string): ServiceRequirements | null => {
    const requirements = serviceRequirements[serviceId];
    
    // Getting service requirements
    
    return requirements || null;
  };

  const refreshServiceRequirements = () => {
    // Refreshing service requirements
    loadAllServiceRequirements();
  };

  // Helper functions for common checks
  const serviceRequiresBath = (serviceId: string): boolean => {
    const requirements = getServiceRequirements(serviceId);
    return requirements?.requires_bath || false;
  };

  const serviceRequiresGrooming = (serviceId: string): boolean => {
    const requirements = getServiceRequirements(serviceId);
    return requirements?.requires_grooming || false;
  };

  const serviceRequiresVet = (serviceId: string): boolean => {
    const requirements = getServiceRequirements(serviceId);
    return requirements?.requires_vet || false;
  };

  const serviceRequiresStaff = (serviceId: string): boolean => {
    const requirements = getServiceRequirements(serviceId);
    return requirements?.requires_grooming || requirements?.requires_vet || false;
  };

  const getServiceDuration = (serviceId: string): number => {
    const requirements = getServiceRequirements(serviceId);
    return requirements?.default_duration || 30;
  };

  const getServicePrice = (serviceId: string): number => {
    const requirements = getServiceRequirements(serviceId);
    return requirements?.base_price || 0;
  };

  const isShowerOnlyService = (serviceId: string): boolean => {
    const requirements = getServiceRequirements(serviceId);
    return requirements?.requires_bath === true && 
           requirements?.requires_grooming === false && 
           requirements?.requires_vet === false;
  };

  return {
    serviceRequirements,
    isLoading,
    error,
    getServiceRequirements,
    refreshServiceRequirements,
    
    // Helper functions
    serviceRequiresBath,
    serviceRequiresGrooming,
    serviceRequiresVet,
    serviceRequiresStaff,
    getServiceDuration,
    getServicePrice,
    isShowerOnlyService,
  };
};
