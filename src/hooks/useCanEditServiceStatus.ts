import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Determine if current user can edit the service status for a given appointment.
 * - Admins: true
 * - Staff: true only if user's staff_profile is assigned to the appointment
 * - Clients/others: false
 *
 * Provide either appointmentId (will query appointment_staff) or staffIds (already fetched on the appointment).
 */
export function useCanEditServiceStatus(
  params: { appointmentId?: string; staffIds?: string[]; isAdmin?: boolean }
) {
  const { appointmentId, staffIds, isAdmin } = params;
  const [can, setCan] = useState<boolean>(false);

  const staffIdsKey = useMemo(() => (staffIds ? staffIds.slice().sort().join(',') : ''), [staffIds]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (isAdmin) {
          if (active) setCan(true);
          return;
        }

        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;
        if (!userId) {
          if (active) setCan(false);
          return;
        }

        const { data: sp } = await supabase
          .from('staff_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        const staffProfileId = sp?.id as string | undefined;
        if (!staffProfileId) {
          if (active) setCan(false);
          return;
        }

        if (staffIds && staffIds.length > 0) {
          if (active) setCan(staffIds.includes(staffProfileId));
          return;
        }

        if (!appointmentId) {
          if (active) setCan(false);
          return;
        }

        const { data: link } = await supabase
          .from('appointment_staff')
          .select('id')
          .eq('appointment_id', appointmentId)
          .eq('staff_profile_id', staffProfileId)
          .limit(1);

        if (active) setCan(!!link && link.length > 0);
      } catch {
        if (active) setCan(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [appointmentId, staffIdsKey, isAdmin]);

  return can;
}


