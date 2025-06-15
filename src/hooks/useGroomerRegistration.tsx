import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const START_HOUR = 9;
const END_HOUR = 17;
const SLOT_INTERVALS = [":00", ":30"];
const PROVIDER_DAYS = 30;
const SHOWER_DAYS = 90; // 3 months approx
const SHOWER_SPOTS = 5;

function generateTimeSlots() {
  const slots: string[] = [];
  for(let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (const mins of SLOT_INTERVALS) {
      slots.push(`${hour.toString().padStart(2,"0")}${mins}`);
    }
  }
  return slots;
}

async function ensureShowerAvailability() {
  const today = new Date();
  const slots = generateTimeSlots();
  for (let i = 0; i < SHOWER_DAYS; i++) {
    const dateObj = new Date(today);
    dateObj.setDate(today.getDate() + i);
    const dateStr = dateObj.toISOString().split('T')[0];
    for(const slot of slots) {
      // Check if it already exists to avoid dup key error
      const { data, error } = await supabase
        .from('shower_availability')
        .select('id')
        .eq('date', dateStr)
        .eq('time_slot', slot)
        .single();
      if (!data) {
        await supabase
          .from('shower_availability')
          .insert({
            date: dateStr,
            time_slot: slot,
            available_spots: SHOWER_SPOTS
          });
      }
      // else: already exists, do nothing
    }
  }
}

export const useGroomerRegistration = () => {
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);

  // Create initial availability for a connected provider_profile
  const createInitialAvailability = async (providerId: string) => {
    setIsCreatingAvailability(true);
    try {
      // Generate provider_availability (next 30 days)
      const today = new Date();
      const slots = generateTimeSlots();
      let batchAll: any[] = [];
      for (let i = 0; i < PROVIDER_DAYS; i++) {
        const dateObj = new Date(today);
        dateObj.setDate(today.getDate() + i);
        const dateStr = dateObj.toISOString().split('T')[0];
        for(const slot of slots) {
          batchAll.push({
            provider_id: providerId,
            date: dateStr,
            time_slot: slot,
            available: true
          });
        }
      }
      // Upsert in batches to avoid hitting rate limits
      const batchSize = 100;
      for(let j = 0; j < batchAll.length; j += batchSize) {
        const batch = batchAll.slice(j, j + batchSize);
        await supabase
          .from('provider_availability')
          .upsert(batch, { onConflict: 'provider_id,date,time_slot' });
      }
      toast.success('Disponibilidade inicial criada!');
      return true;
    } catch (error: any) {
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

      // Ensure shower_availability (anyone can trigger it, but only admins can update)
      await ensureShowerAvailability();
      // provider's own individual availabilities
      const success = await createInitialAvailability(providerProfile.id);
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
