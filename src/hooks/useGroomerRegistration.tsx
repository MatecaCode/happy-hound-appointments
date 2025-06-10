
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGroomerRegistration = () => {
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);

  const createInitialAvailability = async (groomerId: string, groomerName: string) => {
    setIsCreatingAvailability(true);
    try {
      console.log(`🔧 Creating initial availability for groomer: ${groomerName} (${groomerId})`);

      // Create availability for the next 30 days
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Create availability for this groomer
      for (const dateStr of dates) {
        const { error: groomerAvailError } = await supabase.rpc('create_availability_slots', {
          p_resource_type: 'groomer',
          p_date: dateStr,
          p_provider_id: groomerId,
          p_start_time: '09:00',
          p_end_time: '17:00'
        });

        if (groomerAvailError) {
          console.error(`❌ Error creating availability for ${groomerName} on ${dateStr}:`, groomerAvailError);
          // Don't throw error, just log it - we don't want to block registration
        }
      }

      // Also ensure shower availability exists for grooming services
      for (const dateStr of dates) {
        const { error: showerAvailError } = await supabase.rpc('create_availability_slots', {
          p_resource_type: 'shower',
          p_date: dateStr,
          p_provider_id: null,
          p_start_time: '09:00',
          p_end_time: '17:00'
        });

        if (showerAvailError) {
          console.error(`❌ Error creating shower availability for ${dateStr}:`, showerAvailError);
          // Don't throw error, just log it
        }
      }

      console.log(`✅ Initial availability created for groomer: ${groomerName}`);
      return true;
    } catch (error: any) {
      console.error('💥 Error creating initial availability:', error);
      return false;
    } finally {
      setIsCreatingAvailability(false);
    }
  };

  const setupNewGroomer = async (userId: string) => {
    try {
      // Get the groomer record that was just created
      const { data: groomer, error: groomerError } = await supabase
        .from('groomers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (groomerError || !groomer) {
        console.error('❌ Could not find groomer record:', groomerError);
        return false;
      }

      // Create initial availability for the new groomer
      const success = await createInitialAvailability(groomer.id, groomer.name);
      
      if (success) {
        toast.success(`Disponibilidade inicial criada para ${groomer.name}!`);
      } else {
        toast.warning('Conta criada, mas pode ser necessário configurar disponibilidade manualmente.');
      }

      return success;
    } catch (error: any) {
      console.error('💥 Error setting up new groomer:', error);
      return false;
    }
  };

  return {
    setupNewGroomer,
    createInitialAvailability,
    isCreatingAvailability
  };
};
