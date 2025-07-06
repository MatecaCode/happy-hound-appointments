
import { useState, useEffect } from 'react';
import { PricingService, PricingResult, PricingParams } from '@/services/pricingService';

export const usePricing = (params: PricingParams | null) => {
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.serviceId) {
      setPricing(null);
      return;
    }

    const calculatePricing = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await PricingService.calculatePricing(params);
        setPricing(result);
      } catch (err) {
        console.error('Error calculating pricing:', err);
        setError('Erro ao calcular preço');
        setPricing(null);
      } finally {
        setIsLoading(false);
      }
    };

    calculatePricing();
  }, [params?.serviceId, params?.breedId, params?.size]);

  return {
    pricing,
    isLoading,
    error,
    refetchPricing: () => {
      if (params?.serviceId) {
        // Trigger recalculation by updating params
        setPricing(null);
      }
    }
  };
};
