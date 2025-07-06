
import { supabase } from '@/integrations/supabase/client';

export interface PricingResult {
  price: number;
  duration: number;
  priceSource: 'exact_match' | 'service_size_fallback' | 'service_default' | 'system_default';
}

export interface PricingParams {
  serviceId: string;
  breedId?: string;
  size?: string;
}

export class PricingService {
  private static readonly SYSTEM_DEFAULT_PRICE = 50.00;
  private static readonly SYSTEM_DEFAULT_DURATION = 60;

  static async calculatePricing(params: PricingParams): Promise<PricingResult> {
    const { serviceId, breedId, size } = params;

    console.log('🔍 [PRICING] Calculating pricing for:', params);

    try {
      // Step 1: Try exact match (service + breed + size)
      if (breedId && size) {
        const exactMatch = await this.getExactMatchPricing(serviceId, breedId, size);
        if (exactMatch) {
          console.log('✅ [PRICING] Exact match found:', exactMatch);
          return {
            price: exactMatch.price,
            duration: exactMatch.duration_override || this.SYSTEM_DEFAULT_DURATION,
            priceSource: 'exact_match'
          };
        }
      }

      // Step 2: Try service + size fallback (any breed)
      if (size) {
        const sizeFallback = await this.getServiceSizeFallback(serviceId, size);
        if (sizeFallback) {
          console.log('✅ [PRICING] Service+size fallback found:', sizeFallback);
          return {
            price: sizeFallback.price,
            duration: sizeFallback.duration_override || this.SYSTEM_DEFAULT_DURATION,
            priceSource: 'service_size_fallback'
          };
        }
      }

      // Step 3: Try service default
      const serviceDefault = await this.getServiceDefault(serviceId);
      if (serviceDefault) {
        console.log('✅ [PRICING] Service default found:', serviceDefault);
        return {
          price: serviceDefault.base_price || this.SYSTEM_DEFAULT_PRICE,
          duration: serviceDefault.default_duration || this.SYSTEM_DEFAULT_DURATION,
          priceSource: 'service_default'
        };
      }

      // Step 4: System default
      console.log('⚠️ [PRICING] Using system default');
      return {
        price: this.SYSTEM_DEFAULT_PRICE,
        duration: this.SYSTEM_DEFAULT_DURATION,
        priceSource: 'system_default'
      };

    } catch (error) {
      console.error('❌ [PRICING] Error calculating pricing:', error);
      return {
        price: this.SYSTEM_DEFAULT_PRICE,
        duration: this.SYSTEM_DEFAULT_DURATION,
        priceSource: 'system_default'
      };
    }
  }

  private static async getExactMatchPricing(serviceId: string, breedId: string, size: string): Promise<any> {
    try {
      const { data, error } = await (supabase
        .from('service_pricing')
        .select('price, duration_override')
        .eq('service_id', serviceId)
        .eq('breed_id', breedId)
        .eq('size', size) as any)
        .maybeSingle();

      if (error) {
        console.log('🔍 [PRICING] No exact match found:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.log('🔍 [PRICING] Error in getExactMatchPricing:', error);
      return null;
    }
  }

  private static async getServiceSizeFallback(serviceId: string, size: string): Promise<any> {
    try {
      const { data, error } = await (supabase
        .from('service_pricing')
        .select('price, duration_override')
        .eq('service_id', serviceId)
        .eq('size', size)
        .limit(1) as any)
        .maybeSingle();

      if (error) {
        console.log('🔍 [PRICING] No service+size fallback found:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.log('🔍 [PRICING] Error in getServiceSizeFallback:', error);
      return null;
    }
  }

  private static async getServiceDefault(serviceId: string): Promise<any> {
    try {
      const { data, error } = await (supabase
        .from('services')
        .select('base_price, default_duration')
        .eq('id', serviceId) as any)
        .maybeSingle();

      if (error) {
        console.log('🔍 [PRICING] No service default found:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.log('🔍 [PRICING] Error in getServiceDefault:', error);
      return null;
    }
  }
}
