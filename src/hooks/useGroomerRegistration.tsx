
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TIME_SLOT_CONFIG } from '@/utils/timeSlotConfig';

export const useGroomerRegistration = () => {
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);

  // Create initial availability for a connected provider_profile
  const createInitialAvailability = async (providerId: string) => {
    setIsCreatingAvailability(true);
    try {
      // Call the database function to ensure provider availability
      const { error } = await supabase.rpc('ensure_provider_availability', {
        provider_profile_id: providerId,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + TIME_SLOT_CONFIG.PROVIDER_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      if (error) {
        console.error('❌ Error creating provider availability:', error);
        toast.error('Erro ao criar disponibilidade: ' + error.message);
        return false;
      }

      toast.success('Disponibilidade inicial criada!');
      return true;
    } catch (error: any) {
      console.error('❌ Unexpected error in createInitialAvailability:', error);
      toast.warning('Conta criada, mas pode ser necessário configurar disponibilidade manualmente.');
      return false;
    } finally {
      setIsCreatingAvailability(false);
    }
  };

  // FULL setup on new groomer registration: provider + shower
  const setupNewGroomer = async (userId: string) => {
    try {
      // Find their provider_profile id (as 'groomer')
      const { data: providerProfile, error: groomerError } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'groomer')
        .maybeSingle();

      if (groomerError || !providerProfile) {
        console.error('❌ Could not find groomer profile:', groomerError);
        return false;
      }

      // The database trigger should have already created the availability
      // But we can call this as a fallback
      const success = await createInitialAvailability(providerProfile.id);
      return success;
    } catch (error: any) {
      console.error('❌ Error in setupNewGroomer:', error);
      return false;
    }
  };

  return {
    setupNewGroomer,
    createInitialAvailability,
    isCreatingAvailability
  };
};
