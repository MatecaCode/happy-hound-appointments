// Admin-specific availability hook - isolated from client logic
// This mirrors the client logic but is completely separate for admin use

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  generateAdminTimeSlots, 
  getAdminRequiredBackendSlots, 
  formatAdminTimeSlot
} from '@/utils/adminTimeSlotHelpers';

export interface AdminTimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface AdminService {
  id: string;
  name: string;
  service_type: string;
  base_price?: number;
  default_duration?: number;
  requires_grooming?: boolean;
  requires_vet?: boolean;
  requires_bath?: boolean;
  active?: boolean;
}

export interface AdminProvider {
  id: string;
  name: string;
  bio?: string;
  can_bathe?: boolean;
  can_groom?: boolean;
  can_vet?: boolean;
  photo_url?: string;
  hourly_rate?: number;
}

export const useAdminAvailability = () => {
  const [timeSlots, setTimeSlots] = useState<AdminTimeSlot[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all services for admin use
  const fetchAdminServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error fetching services:', error);
        toast.error('Erro ao buscar serviços');
        return;
      }

      setServices(data || []);
    } catch (error) {
      console.error('Unexpected error fetching services:', error);
      toast.error('Erro inesperado ao buscar serviços');
    }
  }, []);

  // Fetch all available providers for admin use
  const fetchAdminProviders = useCallback(async (serviceType?: string) => {
    try {
      let query = supabase
        .from('staff_profiles')
        .select('*')
        .eq('active', true);

      // Filter based on service type capabilities if specified
      if (serviceType === 'grooming') {
        query = query.eq('can_groom', true);
      } else if (serviceType === 'veterinary') {
        query = query.eq('can_vet', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching available providers:', error);
        toast.error('Erro ao buscar profissionais disponíveis');
        return;
      }

      // Transform staff_profiles data to match AdminProvider interface
      const transformedData = data?.map(staff => ({
        id: staff.id,
        name: staff.name,
        bio: staff.bio,
        can_bathe: staff.can_bathe,
        can_groom: staff.can_groom,
        can_vet: staff.can_vet,
        photo_url: staff.photo_url,
        hourly_rate: staff.hourly_rate,
      })) || [];

      setProviders(transformedData);
    } catch (error) {
      console.error('Unexpected error fetching available providers:', error);
      toast.error('Erro inesperado ao buscar profissionais');
    }
  }, []);

  // Simplified admin time slot fetching - always generate slots for the date
  const fetchAdminTimeSlots = useCallback(async (
    date: Date,
    staffIds: string[],
    selectedService: AdminService | null
  ) => {
    console.log(`🔧 [ADMIN_AVAILABILITY] Fetching admin time slots`);
    console.log(`📅 [ADMIN_AVAILABILITY] Date: ${format(date, 'yyyy-MM-dd')}`);
    console.log(`👥 [ADMIN_AVAILABILITY] Staff IDs:`, staffIds);
    console.log(`📋 [ADMIN_AVAILABILITY] Selected service:`, selectedService?.name);

    // Always generate time slots for the selected date
    const isSaturday = date.getDay() === 6; // 6 = Saturday
    const clientSlots = generateAdminTimeSlots(isSaturday);
    
    console.log(`📊 [ADMIN_AVAILABILITY] Generated ${clientSlots.length} base slots for ${isSaturday ? 'Saturday' : 'weekday'}`);

    // If no service selected, mark all slots as unavailable
    if (!selectedService) {
      console.log(`⚠️ [ADMIN_AVAILABILITY] No service selected - marking all slots as unavailable`);
      const unavailableSlots = clientSlots.map(slot => ({
        id: slot,
        time: formatAdminTimeSlot(slot),
        available: false
      }));
      setTimeSlots(unavailableSlots);
      return;
    }

    // If no staff provided and service requires staff, mark all slots as unavailable
    if (!staffIds || staffIds.length === 0) {
      const serviceRequiresStaff = selectedService.requires_grooming || selectedService.requires_vet || selectedService.requires_bath;
      
      if (serviceRequiresStaff) {
        console.log(`⚠️ [ADMIN_AVAILABILITY] Service requires staff but none selected - marking all slots as unavailable`);
        const unavailableSlots = clientSlots.map(slot => ({
          id: slot,
          time: formatAdminTimeSlot(slot),
          available: false
        }));
        setTimeSlots(unavailableSlots);
        return;
      } else {
        // For services that don't require staff, mark all slots as available
        console.log(`✅ [ADMIN_AVAILABILITY] Service doesn't require staff - marking all slots as available`);
        const availableSlots = clientSlots.map(slot => ({
          id: slot,
          time: formatAdminTimeSlot(slot),
          available: true
        }));
        setTimeSlots(availableSlots);
        return;
      }
    }

    // Deduplicate staff IDs
    const uniqueStaffIds = [...new Set(staffIds)];
    const dateForQuery = format(date, 'yyyy-MM-dd');
    const serviceDuration = selectedService.default_duration || 60;

    setLoading(true);

    try {
      console.log(`🔍 [ADMIN_AVAILABILITY] Fetching availability data for ${uniqueStaffIds.length} staff members`);
      console.log(`⏱️ [ADMIN_AVAILABILITY] Service duration: ${serviceDuration} minutes`);

      // Fetch staff availability from database
      const { data: rawAvailabilityData, error } = await supabase
        .from('staff_availability')
        .select('staff_profile_id, time_slot, available')
        .in('staff_profile_id', uniqueStaffIds)
        .eq('date', dateForQuery);

      if (error) {
        console.error('❌ [ADMIN_AVAILABILITY] Error fetching staff availability:', error);
        toast.error('Erro ao buscar horários disponíveis');
        // Mark all slots as unavailable on error
        const unavailableSlots = clientSlots.map(slot => ({
          id: slot,
          time: formatAdminTimeSlot(slot),
          available: false
        }));
        setTimeSlots(unavailableSlots);
        return;
      }

      console.log(`📊 [ADMIN_AVAILABILITY] Raw availability data: ${rawAvailabilityData?.length || 0} records`);

      // Create availability lookup map
      const availabilityMap = new Map();
      rawAvailabilityData?.forEach(record => {
        const key = `${record.staff_profile_id}_${record.time_slot}`;
        availabilityMap.set(key, record.available);
      });

      console.log(`🗂️ [ADMIN_AVAILABILITY] Availability map created with ${availabilityMap.size} entries`);

      // Check each 30-minute slot for availability
      const availableSlots: AdminTimeSlot[] = [];

      for (const clientSlot of clientSlots) {
        let isSlotAvailable = true;

        // Get all required 10-minute slots for the full service duration
        const requiredSlots = getAdminRequiredBackendSlots(clientSlot, serviceDuration, isSaturday);
        
        // Check if ALL selected staff are available for ALL required slots
        for (const staffId of uniqueStaffIds) {
          let staffAvailable = true;
          
          for (const requiredSlot of requiredSlots) {
            const key = `${staffId}_${requiredSlot}`;
            const isAvailable = availabilityMap.get(key);
            
            // If no data exists for this slot, mark as unavailable
            if (isAvailable !== true) {
              staffAvailable = false;
              break;
            }
          }
          
          if (!staffAvailable) {
            isSlotAvailable = false;
            break;
          }
        }

        availableSlots.push({
          id: clientSlot,
          time: formatAdminTimeSlot(clientSlot),
          available: isSlotAvailable
        });
      }

      console.log(`✅ [ADMIN_AVAILABILITY] Generated ${availableSlots.length} admin time slots`);
      console.log(`📊 [ADMIN_AVAILABILITY] Available slots: ${availableSlots.filter(s => s.available).length}`);
      
      setTimeSlots(availableSlots);

    } catch (error) {
      console.error('❌ [ADMIN_AVAILABILITY] Pipeline error:', error);
      toast.error('Erro inesperado ao buscar horários');
      // Mark all slots as unavailable on error
      const unavailableSlots = clientSlots.map(slot => ({
        id: slot,
        time: formatAdminTimeSlot(slot),
        available: false
      }));
      setTimeSlots(unavailableSlots);
    } finally {
      setLoading(false);
    }
  }, []);

  // Monitor critical time slot issues
  const availableCount = timeSlots.filter(s => s.available).length;
  if (timeSlots.length > 0 && availableCount === 0) {
    console.log('[ADMIN_AVAILABILITY] No available slots found for current selection');
  }

  return {
    timeSlots,
    services,
    providers,
    loading,
    fetchAdminServices,
    fetchAdminProviders,
    fetchAdminTimeSlots,
  };
}; 