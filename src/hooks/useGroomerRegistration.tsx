
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGroomerRegistration = () => {
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);

  // This function is now deprecated since staff_availability system handles everything
  const createInitialAvailability = async (providerId: string) => {
    setIsCreatingAvailability(true);
    try {
      console.log('✅ Staff availability is now handled automatically by staff_profiles system');
      toast.success('Disponibilidade configurada automaticamente!');
      return true;
    } catch (error: any) {
      console.error('❌ Unexpected error in createInitialAvailability:', error);
      toast.warning('Disponibilidade deve ter sido configurada automaticamente.');
      return false;
    } finally {
      setIsCreatingAvailability(false);
    }
  };

  // This function is now simplified since the database trigger handles most of the work
  const setupNewGroomer = async (userId: string) => {
    // The database trigger should have already created everything we need
    // This function is kept for backwards compatibility
    console.log('✅ Groomer setup should be handled automatically by database triggers');
    toast.success('Conta de tosador configurada automaticamente!');
    return true;
  };

  return {
    setupNewGroomer,
    createInitialAvailability,
    isCreatingAvailability
  };
};
