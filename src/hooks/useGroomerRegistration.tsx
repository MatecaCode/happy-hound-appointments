import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGroomerRegistration = () => {
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);

  // Create initial availability for a connected provider_profile
  const createInitialAvailability = async (providerId: string, providerName: string) => {
    setIsCreatingAvailability(true);
    try {
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      for (const dateStr of dates) {
        // Insert 30-min slots from 09:00 to 17:00 for each date
        const timeSlots = [];
        for (let hour = 9; hour < 17; hour++) {
          timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
          timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        const availSlots = timeSlots.map(slot => ({
          provider_id: providerId,
          date: dateStr,
          time_slot: slot,
          available: true
        }));
        await supabase
          .from('provider_availability')
          .upsert(availSlots, { onConflict: 'provider_id,date,time_slot' });
      }
      toast.success(`Disponibilidade inicial criada para ${providerName}!`);
      return true;
    } catch (error: any) {
      toast.warning('Conta criada, mas pode ser necessário configurar disponibilidade manualmente.');
      return false;
    } finally {
      setIsCreatingAvailability(false);
    }
  };

  const setupNewGroomer = async (userId: string) => {
    try {
      // Find the provider_profile entry for this user and role
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
      // providerName may be unavailable, fallback to 'Tosador(a)'
      const providerName = providerProfile.name ?? 'Tosador(a)';
      const success = await createInitialAvailability(providerProfile.id, providerName);
      return success;
    } catch (error: any) {
      return false;
    }
  };

  return {
    setupNewGroomer,
    createInitialAvailability,
    isCreatingAvailability
  };
};
