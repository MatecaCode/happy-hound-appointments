
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useAppointmentData } from './useAppointmentData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePricing } from './usePricing';
import { debugAppointmentStatus, debugServiceStatus } from '@/utils/debugAppointmentStatus';
import { useNavigate } from 'react-router-dom';
import { getRequiredBackendSlots } from '@/utils/timeSlotHelpers';

export interface Pet {
  id: string;
  name: string;
  breed?: string;
  breed_id?: string;
  age?: string;
  size?: string;
  weight?: number;
  gender?: string;
  notes?: string;
}

export interface Service {
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

export interface Provider {
  id: string;
  name: string;
  role: string;
  rating: number;
  about: string;
  profile_image?: string;
  specialty?: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface NextAvailable {
  date: string;
  time: string;
  staff_name?: string;
}

export const useAppointmentForm = (serviceType: 'grooming' | 'veterinary') => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedGroomerId, setSelectedGroomerId] = useState<string | null>(null);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'next-available'>('calendar');
  const [formStep, setFormStep] = useState(1);
  const [serviceRequiresStaff, setServiceRequiresStaff] = useState(false);
  const [serviceRequirementsLoaded, setServiceRequirementsLoaded] = useState(false);

  // Add selected staff state for multi-role support
  const [selectedStaff, setSelectedStaff] = useState<{
    batherId?: string;
    groomerId?: string;
    vetId?: string;
  }>({});

  const {
    timeSlots,
    nextAvailable,
    userPets,
    services,
    groomers,
    fetchAvailableProviders,
    fetchServices,
    fetchUserPets,
    fetchTimeSlots,
  } = useAppointmentData();

  // 🚨 CRITICAL: Log timeSlots received from useAppointmentData
  useEffect(() => {
    console.log('🚨 [APPOINTMENT_FORM] timeSlots received from useAppointmentData:', {
      length: timeSlots.length,
      availableCount: timeSlots.filter(s => s.available).length,
      fullArray: timeSlots,
      availableSlotsOnly: timeSlots.filter(s => s.available),
      timestamp: new Date().toISOString()
    });
  }, [timeSlots]);

  // Get pricing for current pet/service combination
  const pricingParams = selectedPet && selectedService ? {
    serviceId: selectedService.id,
    breedId: selectedPet.breed_id,
    size: selectedPet.size
  } : null;

  const { pricing } = usePricing(pricingParams);

  // Check service requirements when service is selected
  useEffect(() => {
    if (selectedService) {
      console.log('🔍 DEBUG: Checking service requirements for:', selectedService.name);
      const requiresStaff = selectedService.requires_grooming || selectedService.requires_vet || selectedService.requires_bath;
      console.log('🔍 DEBUG: Service requires staff:', requiresStaff);
      setServiceRequiresStaff(requiresStaff);
      setServiceRequirementsLoaded(true);
    } else {
      setServiceRequirementsLoaded(false);
    }
  }, [selectedService]);

  // Fetch user pets when user changes
  useEffect(() => {
    if (user) {
      fetchUserPets(user.id);
    }
  }, [user, fetchUserPets]);

  // Helper function to get all selected staff IDs as an array (DEDUPLICATED and MEMOIZED)
  const getSelectedStaffIds = useMemo((): string[] => {
    const staffIds: string[] = [];
    
    if (selectedStaff.batherId) staffIds.push(selectedStaff.batherId);
    if (selectedStaff.groomerId) staffIds.push(selectedStaff.groomerId);
    if (selectedStaff.vetId) staffIds.push(selectedStaff.vetId);
    
    // Fallback to legacy selectedGroomerId for backward compatibility
    if (staffIds.length === 0 && selectedGroomerId) {
      staffIds.push(selectedGroomerId);
    }
    
    // CRITICAL: Deduplicate staff IDs to prevent double-checking same staff
    const uniqueStaffIds = [...new Set(staffIds)];
    
    console.log('🎯 [GET_SELECTED_STAFF_IDS] Staff selection analysis:', {
      selectedStaff,
      selectedGroomerId,
      rawStaffIds: staffIds,
      uniqueStaffIds: uniqueStaffIds,
      deduplicationApplied: staffIds.length !== uniqueStaffIds.length
    });
    
    console.log('🎯 [GET_SELECTED_STAFF_IDS] FINAL staff IDs for all operations:', uniqueStaffIds);
    
    return uniqueStaffIds;
  }, [selectedStaff, selectedGroomerId]);

  // Memoize the staff IDs as a string for stable dependency comparison
  const staffIdsKey = useMemo(() => {
    return getSelectedStaffIds.sort().join(',');
  }, [getSelectedStaffIds]);

  // Only fetch time slots when we have ALL required data
  useEffect(() => {
    console.log('\n🚨 [APPOINTMENT_FORM] ===== FETCH TRIGGER EVALUATION =====');
    console.log('🚨 [APPOINTMENT_FORM] Checking requirements:', {
      hasDate: !!date,
      hasSelectedService: !!selectedService,
      serviceName: selectedService?.name,
      staffIds: getSelectedStaffIds,
      serviceRequiresStaff,
      formStep,
      isStep3: formStep === 3
    });

    // CRITICAL: Only fetch on step 3 (date/time selection) and when we have ALL required data
    if (formStep !== 3) {
      console.log('🚨 [APPOINTMENT_FORM] Not on step 3 - skipping fetchTimeSlots');
      return;
    }

    if (!date || !selectedService) {
      console.log('🚨 [APPOINTMENT_FORM] Missing date or service - clearing slots');
      return;
    }

    // If service requires staff, make sure staff is selected
    if (serviceRequiresStaff && getSelectedStaffIds.length === 0) {
      console.log('🚨 [APPOINTMENT_FORM] Service requires staff but none selected - clearing slots');
      return;
    }

    // Now we have all required data - fetch time slots
    const staffIds = serviceRequiresStaff ? getSelectedStaffIds : [];
    
    console.log('✅ [APPOINTMENT_FORM] All requirements met - TRIGGERING fetchTimeSlots:', {
      date: date.toISOString().split('T')[0],
      staffIds,
      service: selectedService.name
    });
    
    fetchTimeSlots(date, staffIds, setIsLoading, selectedService);
  }, [date, staffIdsKey, selectedService, serviceRequiresStaff, fetchTimeSlots, formStep, getSelectedStaffIds]);

  const handleNextAvailableSelect = useCallback(() => {
    if (nextAvailable) {
      setDate(new Date(nextAvailable.date));
      setSelectedTimeSlotId(nextAvailable.time);
      setActiveTab('calendar');
    }
  }, [nextAvailable]);

  const handleSubmit = useCallback(async (e: React.FormEvent, selectedStaffIds?: string[]) => {
    e.preventDefault();
    
    console.log('🚀 [BOOKING_SUBMIT] Starting submission with multi-staff support...');
    
    if (!user || !selectedPet || !selectedService || !date || !selectedTimeSlotId) {
      console.error('❌ [BOOKING_SUBMIT] Missing required fields');
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Get staff IDs - use parameter if provided, otherwise get from state (DEDUPLICATED)
    const rawStaffIds = selectedStaffIds || getSelectedStaffIds;
    // CRITICAL: Deduplicate staff IDs at the very start of booking
    const uniqueStaffIds = [...new Set(rawStaffIds)];
    
    console.log('📋 [BOOKING_SUBMIT] Multi-staff booking details (DEDUPLICATED):', {
      user: user.id,
      pet: selectedPet.name,
      service: selectedService.name,
      date: date.toISOString().split('T')[0],
      time: selectedTimeSlotId,
      rawStaffIds,
      uniqueStaffIds,
      uniqueStaffCount: uniqueStaffIds.length,
      deduplicationApplied: rawStaffIds.length !== uniqueStaffIds.length,
      serviceDuration: pricing?.duration || selectedService.default_duration || 60
    });
    
    console.log('🎯 [BOOKING_SUBMIT] FINAL staff IDs for booking:', uniqueStaffIds);

    try {
      setIsLoading(true);
      
      // Start minimum loading time (1.5 seconds)
      const minimumLoadingTime = new Promise(resolve => setTimeout(resolve, 1500));
      
      // Debug status values first
      await debugAppointmentStatus();
      await debugServiceStatus();
      
      console.log('📋 [BOOKING_SUBMIT] Booking details:', {
        user: user.id,
        pet: selectedPet.name,
        service: selectedService.name,
        date: date.toISOString().split('T')[0],
        time: selectedTimeSlotId,
        uniqueStaffIds: uniqueStaffIds,
        serviceDuration: pricing?.duration || selectedService.default_duration || 60
      });

      // Get client_id from user_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        console.error('❌ [BOOKING_SUBMIT] Client not found:', clientError);
        throw new Error('Erro ao encontrar dados do cliente');
      }

      const dateStr = date.toISOString().split('T')[0];
      const serviceDuration = pricing?.duration || selectedService.default_duration || 60;
      
      const appointmentData = {
        client_id: clientData.id,
        pet_id: selectedPet.id,
        service_id: selectedService.id,
        date: dateStr,
        time: selectedTimeSlotId,
        notes: notes || null,
        status: 'pending', // Always start as pending for admin approval
        service_status: 'not_started',
        duration: serviceDuration,
        total_price: pricing?.price || selectedService.base_price || 0
      };

      console.log('📝 [BOOKING_SUBMIT] Creating appointment with data:', appointmentData);

      const bookingPromise = (async () => {
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (appointmentError || !appointment) {
          console.error('❌ [BOOKING_SUBMIT] Appointment creation failed:', appointmentError);
          throw new Error(`Erro ao criar agendamento: ${appointmentError?.message || 'Erro desconhecido'}`);
        }

        console.log('✅ [BOOKING_SUBMIT] Appointment created:', appointment.id);

        // Link ALL UNIQUE selected staff members
        if (uniqueStaffIds.length > 0) {
          console.log('🔗 [BOOKING_SUBMIT] Linking UNIQUE staff members:', uniqueStaffIds);
          
          for (const staffId of uniqueStaffIds) {
            const { error: staffLinkError } = await supabase
              .from('appointment_staff')
              .insert({
                appointment_id: appointment.id,
                staff_profile_id: staffId,
                role: 'primary'
              });

            if (staffLinkError) {
              console.error('⚠️ [BOOKING_SUBMIT] Staff linking failed for:', staffId, staffLinkError);
            } else {
              console.log('✅ [BOOKING_SUBMIT] Staff linked:', staffId);
            }
          }

          // Update staff availability for ALL UNIQUE selected staff using 10-minute granular logic
          console.log('🔒 [BOOKING_SUBMIT] Updating staff availability for UNIQUE staff members...');

          for (const staffId of uniqueStaffIds) {
            // Get all 10-minute slots that need to be marked unavailable
            const requiredSlots = getRequiredBackendSlots(selectedTimeSlotId, serviceDuration);
            
            console.log(`🔒 [BOOKING_SUBMIT] Marking ${requiredSlots.length} 10-min slots unavailable for UNIQUE staff ${staffId}:`, requiredSlots);

            for (const timeSlot of requiredSlots) {
              const { error: availabilityError } = await supabase
                .from('staff_availability')
                .update({ available: false })
                .eq('staff_profile_id', staffId)
                .eq('date', dateStr)
                .eq('time_slot', timeSlot);

              if (availabilityError) {
                console.error('⚠️ [BOOKING_SUBMIT] Availability update failed:', {
                  staffId,
                  timeSlot,
                  error: availabilityError
                });
              } else {
                console.log(`✅ [BOOKING_SUBMIT] Marked 10-min slot ${timeSlot} unavailable for UNIQUE staff ${staffId}`);
              }
            }
          }
        }

        return appointment;
      })();

      // Wait for both minimum loading time and booking completion
      const [appointment] = await Promise.all([bookingPromise, minimumLoadingTime]);

      // Success! Show confirmation message
      toast.success('Agendamento criado com sucesso! Aguardando aprovação da clínica.', {
        duration: 4000,
        style: {
          background: '#F59E0B',
          color: 'white',
          border: 'none'
        }
      });

      console.log('🎉 [BOOKING_SUBMIT] Multi-staff booking completed successfully with UNIQUE staff!');
      
      // Reset form
      setSelectedPet(null);
      setSelectedService(null);
      setDate(undefined);
      setSelectedTimeSlotId(null);
      setSelectedGroomerId(null);
      setSelectedStaff({});
      setNotes('');
      setFormStep(1);
      
      // Redirect to booking success page with appointment ID
      navigate(`/booking-success?id=${appointment.id}`);
      
    } catch (error: any) {
      console.error('❌ [BOOKING_SUBMIT] Fatal error:', error);
      
      // Wait for minimum loading time even on error
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 1500)));
      
      const errorMessage = error.message || 'Erro desconhecido ao criar agendamento';
      toast.error(`Erro ao criar agendamento: ${errorMessage}`, {
        duration: 8000,
        style: {
          background: '#EF4444',
          color: 'white',
          border: 'none'
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedPet, selectedService, date, selectedTimeSlotId, selectedGroomerId, selectedStaff, notes, serviceRequiresStaff, pricing, navigate, getSelectedStaffIds]);

  return {
    date,
    setDate,
    selectedGroomerId,
    setSelectedGroomerId,
    selectedTimeSlotId,
    setSelectedTimeSlotId,
    selectedPet,
    setSelectedPet,
    selectedService,
    setSelectedService,
    notes,
    setNotes,
    timeSlots,
    isLoading,
    nextAvailable,
    activeTab,
    setActiveTab,
    formStep,
    setFormStep,
    userPets,
    services,
    groomers,
    handleNextAvailableSelect,
    handleSubmit,
    fetchServices: fetchServices,
    serviceRequiresStaff,
    serviceRequirementsLoaded,
    pricing,
    // Expose multi-staff state and helpers
    selectedStaff,
    setSelectedStaff,
    getSelectedStaffIds,
  };
};
