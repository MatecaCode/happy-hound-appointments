
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RefreshAvailabilityResponse {
  success: boolean;
  message: string;
  totalSlots?: number;
  breakdown?: {
    groomers: number;
    veterinarians: number;
    daysGenerated: number;
    timeSlotsPerDay: number;
    groomerSlots: number;
    vetSlots: number;
    showerSlots: number;
  };
  error?: string;
}

export const refreshAvailability = async (): Promise<RefreshAvailabilityResponse> => {
  try {
    console.log('🔧 Calling refresh-availability edge function...');

    const { data, error } = await supabase.functions.invoke('refresh-availability', {
      body: {}
    });

    if (error) {
      console.error('💥 Error calling refresh-availability function:', error);
      toast.error('Erro ao atualizar disponibilidade: ' + error.message);
      return {
        success: false,
        message: 'Erro ao chamar função de atualização',
        error: error.message
      };
    }

    if (data.success) {
      console.log('✅ Availability refreshed successfully:', data);
      toast.success(data.message);
    } else {
      console.error('❌ Refresh availability failed:', data.error);
      toast.error('Erro ao atualizar disponibilidade: ' + data.error);
    }

    return data;

  } catch (error: any) {
    console.error('💥 Unexpected error in refreshAvailability:', error);
    toast.error('Erro inesperado ao atualizar disponibilidade');
    return {
      success: false,
      message: 'Erro inesperado',
      error: error.message
    };
  }
};
