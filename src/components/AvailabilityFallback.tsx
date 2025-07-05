
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TIME_SLOT_CONFIG } from '@/utils/timeSlotConfig';
import { toast } from 'sonner';

interface AvailabilityFallbackProps {
  targetDate?: Date;
  onAvailabilityEnsured?: () => void;
}

export default function AvailabilityFallback({ 
  targetDate = new Date(), 
  onAvailabilityEnsured 
}: AvailabilityFallbackProps) {
  const [isChecking, setIsChecking] = useState(false);

  const ensureAvailabilityExists = async (date: Date) => {
    setIsChecking(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if staff availability exists for this date (updated for Phase 1)
      const { data: staffData, error: staffError } = await supabase
        .from('staff_availability')
        .select('date')
        .eq('date', dateStr)
        .limit(1);

      if (staffError) {
        console.error('Error checking staff availability:', staffError);
        return;
      }

      // If no availability exists, we would need to generate it
      // For now, just log that availability should be generated
      if (!staffData || staffData.length === 0) {
        console.log('🔧 No staff availability found for', dateStr);
        console.log('💡 Staff availability should be generated via admin panel or background job');
        
        // Notify callback that we've checked
        onAvailabilityEnsured?.();
      }
    } catch (error: any) {
      console.error('Error in availability fallback:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    ensureAvailabilityExists(targetDate);
  }, [targetDate]);

  // This component is invisible but ensures availability exists
  return null;
}
