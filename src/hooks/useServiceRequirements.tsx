
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
      console.log('🔍 [SERVICE_REQUIREMENTS] Loading all service requirements from Phase 1 schema');
      
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

      console.log('📊 [SERVICE_REQUIREMENTS] Raw services data:', services);

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

      console.log('✅ [SERVICE_REQUIREMENTS] Requirements map built:', requirementsMap);
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
    
    console.log('🔍 [SERVICE_REQUIREMENTS] Getting requirements for service:', {
      serviceId,
      requirements,
      available_services: Object.keys(serviceRequirements)
    });
    
    return requirements || null;
  };

  const refreshServiceRequirements = () => {
    console.log('🔄 [SERVICE_REQUIREMENTS] Refreshing service requirements');
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
