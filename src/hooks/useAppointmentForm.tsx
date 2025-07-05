
import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAppointmentFormState } from './useAppointmentFormState';
import { useAppointmentData } from './useAppointmentData';
import { useServiceRequirements } from './useServiceRequirements';
import { createAppointment } from '@/utils/appointmentUtils';
import { toast } from 'sonner';

export interface Staff {
  id: string;
  user_id: string;
  name: string;
  can_bathe: boolean;
  can_groom: boolean;
  can_vet: boolean;
  profile_image?: string;
  rating?: number;
  specialty?: string;
  about?: string;
}

export interface Pet {
  id: string;
  name: string;
  breed?: string;
  age?: string;
}

export interface Service {
  id: string;
  name: string;
  base_price: number;
  default_duration: number;
  service_type: string;
  requires_grooming: boolean;
  requires_vet: boolean;
  requires_bath: boolean;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface NextAvailable {
  date: string;
  time: string;
  staff_name: string;
}

export const useAppointmentForm = (serviceType: 'grooming' | 'veterinary') => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Use the separated hooks
  const formState = useAppointmentFormState();
  const {
    timeSlots,
    nextAvailable,
    userPets,
    services,
    groomers: staff, // Renamed from groomers to staff for Phase 1
    fetchAvailableProviders: fetchAvailableStaff,
    fetchServices,
    fetchUserPets,
    fetchTimeSlots,
  } = useAppointmentData();

  // Use the new centralized service requirements hook
  const { getServiceRequirements } = useServiceRequirements();

  // Get the currently selected service object
  const selectedServiceObj = services.find(s => s.id === formState.selectedService);

  // Get service requirements from the centralized hook
  const serviceRequirements = formState.selectedService 
    ? getServiceRequirements(formState.selectedService)
    : null;

  // Extract requirements from the centralized data (updated for Phase 1)
  const requiresStaff = serviceRequirements?.requires_grooming || serviceRequirements?.requires_vet || false;
  const requiresBath = serviceRequirements?.requires_bath || false;
  const requiresVet = serviceRequirements?.requires_vet || false;
  const serviceRequirementsLoaded = Boolean(serviceRequirements);

  // NEW: Check if service is bath-only
  const isBathOnlyService = serviceRequirementsLoaded && 
    requiresBath && 
    !serviceRequirements?.requires_grooming && 
    !requiresVet;

  console.log('🔍 [APPOINTMENT_FORM] Phase 1 service requirements analysis:', {
    service_id: formState.selectedService,
    requirements: serviceRequirements,
    requires_staff: requiresStaff,
    requires_bath: requiresBath,
    requires_vet: requiresVet,
    is_bath_only: isBathOnlyService
  });

  // ✅ SIMPLIFIED: Only validate that slot exists in current timeSlots array
  const isSelectedSlotValid = React.useMemo(() => {
    if (!formState.selectedTimeSlotId) return false;
    const validSlot = timeSlots.find(slot => 
      slot.id === formState.selectedTimeSlotId && slot.available
    );
    console.log('🔒 [APPOINTMENT_FORM] Simple slot validation:', {
      selected_slot: formState.selectedTimeSlotId,
      slot_exists_and_available: Boolean(validSlot),
      total_available_slots: timeSlots.filter(s => s.available).length
    });
    return Boolean(validSlot);
  }, [formState.selectedTimeSlotId, timeSlots]);

  // Clear selected staff if service doesn't require one
  useEffect(() => {
    if (serviceRequirementsLoaded && !requiresStaff && formState.selectedGroomerId) {
      console.log('🔍 [APPOINTMENT_FORM] Service does not require staff, clearing selected staff');
      formState.setSelectedGroomerId('');
    }
  }, [requiresStaff, serviceRequirementsLoaded, formState.selectedGroomerId, formState]);

  // ✅ IMPROVED: Only reset time slot when NECESSARY (not aggressively)
  React.useEffect(() => {
    console.log('🔄 [APPOINTMENT_FORM] Dependency change detected:', {
      service: formState.selectedService,
      staff: formState.selectedGroomerId,
      date: formState.date?.toISOString(),
      current_slot: formState.selectedTimeSlotId,
      will_clear_slot: Boolean(formState.selectedTimeSlotId)
    });
    
    // Reset time slot when service, staff, or date changes
    if (formState.selectedTimeSlotId) {
      console.log('🔄 [APPOINTMENT_FORM] Dependencies changed, clearing time slot selection');
      formState.setSelectedTimeSlotId('');
      toast.info('Seleção de horário foi resetada devido à mudança de parâmetros');
    }
  }, [formState.selectedService, formState.selectedGroomerId, formState.date]);

  // ✅ SMART: Only reset slot if it's NOT in the new available slots
  React.useEffect(() => {
    console.log('🕐 [APPOINTMENT_FORM] Time slots updated:', {
      slots_count: timeSlots.length,
      available_count: timeSlots.filter(s => s.available).length,
      selected_slot: formState.selectedTimeSlotId,
      selected_slot_exists: timeSlots.some(s => s.id === formState.selectedTimeSlotId),
      selected_slot_available: timeSlots.some(s => s.id === formState.selectedTimeSlotId && s.available)
    });

    // ✅ IMPROVED: Only clear if selected slot is NOT in the new available slots
    if (formState.selectedTimeSlotId && 
        !timeSlots.some(s => s.id === formState.selectedTimeSlotId && s.available)) {
      console.log('⚠️ [APPOINTMENT_FORM] Selected slot not in new available slots, clearing');
      toast.warning('Horário selecionado não está mais disponível');
      formState.setSelectedTimeSlotId('');
    }
  }, [timeSlots, formState.selectedTimeSlotId, formState]);

  // Handle next available appointment selection
  const handleNextAvailableSelect = () => {
    if (nextAvailable) {
      formState.setDate(new Date(nextAvailable.date));
      formState.setSelectedTimeSlotId(nextAvailable.time);
      formState.setActiveTab('calendar');
    }
  };

  // ✅ CLEAN SUBMIT: Updated for Phase 1 schema with admin override tracking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 [APPOINTMENT_FORM] SUBMIT: User clicked confirmation button:', {
      selected_slot: formState.selectedTimeSlotId,
      is_slot_valid: isSelectedSlotValid,
      available_slots_count: timeSlots.filter(s => s.available).length,
      is_admin: isAdmin,
      timestamp: new Date().toISOString()
    });
    
    // ✅ SIMPLIFIED: Basic validation only
    if (!formState.selectedTimeSlotId) {
      console.error('❌ [APPOINTMENT_FORM] SUBMIT BLOCKED: No slot selected');
      toast.error('Por favor, selecione um horário');
      return;
    }

    if (!isSelectedSlotValid) {
      console.error('❌ [APPOINTMENT_FORM] SUBMIT BLOCKED: Selected slot not valid');
      toast.error('Horário selecionado não está mais disponível. Selecione novamente.');
      return;
    }
    
    console.log('🚀 [APPOINTMENT_FORM] SUBMIT: Basic validations passed, proceeding with booking');
    
    if (!user) {
      console.log('❌ [APPOINTMENT_FORM] No user, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (!formState.selectedPet || !formState.selectedService || !formState.date) {
      console.log('❌ [APPOINTMENT_FORM] Missing required fields for submission:', {
        has_pet: !!formState.selectedPet,
        has_service: !!formState.selectedService,
        has_date: !!formState.date,
        has_time_slot: !!formState.selectedTimeSlotId
      });
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Only require staff if service requires one (not for bath-only services)
    if (requiresStaff && !formState.selectedGroomerId) {
      console.log('❌ [APPOINTMENT_FORM] Service requires staff but none selected');
      toast.error('Por favor, selecione um profissional');
      return;
    }

    // UPDATED: Get the staff_profile_id from the selected staff (Phase 1)
    let staffProfileId: string | null = null;
    if (requiresStaff && formState.selectedGroomerId) {
      const selectedStaff = staff.find(s => s.id === formState.selectedGroomerId);
      staffProfileId = selectedStaff?.id || null;
      
      console.log('🎯 [APPOINTMENT_FORM] SUBMIT: Staff ID mapping for Phase 1:', {
        staff_user_id: formState.selectedGroomerId,
        staff_profile_id: staffProfileId,
        selected_staff: selectedStaff
      });

      if (!staffProfileId) {
        console.error('❌ [APPOINTMENT_FORM] CRITICAL: No staff_profile_id found for selected staff');
        toast.error('Erro: ID do profissional não encontrado');
        return;
      }
    }

    formState.setIsLoading(true);
    
    // ✅ CLEAN: Final payload for Phase 1 - no redundant slot validation
    console.log('📤 [APPOINTMENT_FORM] 🔥 FINAL PAYLOAD TO createAppointment (Phase 1):', {
      user_id: user.id,
      pet_id: formState.selectedPet,
      service_id: formState.selectedService,
      staff_profile_id: staffProfileId,
      date: formState.date,
      time_slot: formState.selectedTimeSlotId,
      notes: formState.notes,
      is_admin_override: isAdmin,
      slots_already_validated_by_rpc: true
    });

    // Pass the staff_profile_id directly and track admin overrides
    const result = await createAppointment(
      user.id,
      formState.selectedPet,
      formState.selectedService,
      staffProfileId, // Pass staff_profile_id directly
      formState.date,
      formState.selectedTimeSlotId,
      formState.notes,
      isAdmin // Track if this is an admin override
    );

    console.log('📨 [APPOINTMENT_FORM] SUBMIT: createAppointment result:', result);

    if (result.success && result.bookingData) {
      console.log('🎉 [APPOINTMENT_FORM] SUBMIT: Success! Navigating to booking-success');
      navigate('/booking-success', { 
        state: { bookingData: result.bookingData } 
      });
    } else {
      console.log('❌ [APPOINTMENT_FORM] SUBMIT: Booking failed with error:', result.error);
      
      // Display detailed error information for debugging
      if (result.error) {
        console.error('💥 [APPOINTMENT_FORM] DETAILED ERROR:', result.error);
        
        // Show a more specific toast based on the error
        if (result.error.message) {
          toast.error(`Erro: ${result.error.message}`);
        } else {
          toast.error('Erro no agendamento. Tente novamente.');
        }
      }
    }
    
    formState.setIsLoading(false);
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      fetchUserPets(user.id);
    }
  }, [user, fetchUserPets]);

  // NEW: Handle bath-only services - skip to step 4 directly
  useEffect(() => {
    if (isBathOnlyService && formState.formStep === 2 && formState.date) {
      console.log('🛁 [APPOINTMENT_FORM] Bath-only service detected, skipping to step 4');
      formState.setFormStep(4); // Skip staff selection, go directly to time slots
    }
  }, [isBathOnlyService, formState.formStep, formState.date, formState]);

  // Fetch available staff when date changes and service requires staff
  useEffect(() => {
    if (formState.formStep === 3 && formState.date && requiresStaff && serviceRequirementsLoaded && !isBathOnlyService) {
      console.log('🔍 [APPOINTMENT_FORM] useEffect triggered for step 3 staff fetch');
      fetchAvailableStaff(serviceType, formState.date, selectedServiceObj);
    }
  }, [formState.formStep, formState.date, serviceType, selectedServiceObj, fetchAvailableStaff, requiresStaff, serviceRequirementsLoaded, isBathOnlyService]);

  // Fetch time slots for final step
  useEffect(() => {
    // Final step is step 4 (with/without staff) OR step 3 for bath-only
    const isFinalStep = formState.formStep === 4 || (isBathOnlyService && formState.formStep === 3);
    
    if (isFinalStep && formState.date && serviceRequirementsLoaded) {
      console.log('🔍 [APPOINTMENT_FORM] useEffect triggered for time slots fetch:', {
        step: formState.formStep,
        is_final_step: isFinalStep,
        requires_staff: requiresStaff,
        is_bath_only: isBathOnlyService,
        staff_user_id: formState.selectedGroomerId,
        date: formState.date
      });
      
      // Pass staff_profile_id to fetchTimeSlots for Phase 1
      const selectedStaff = staff.find(s => s.id === formState.selectedGroomerId);
      const staffProfileId = selectedStaff?.id || null;
      
      fetchTimeSlots(formState.date, staffProfileId, formState.setIsLoading, selectedServiceObj);
    }
  }, [formState.formStep, formState.date, formState.selectedGroomerId, selectedServiceObj, fetchTimeSlots, requiresStaff, serviceRequirementsLoaded, isBathOnlyService, staff]);

  return {
    // Spread all form state
    ...formState,
    
    // Data state (renamed for Phase 1)
    timeSlots,
    nextAvailable,
    userPets,
    services,
    groomers: staff, // Keep groomers name for backward compatibility
    staff, // NEW: Also expose as staff
    
    // Service requirements from centralized hook (updated for Phase 1)
    serviceRequiresStaff: requiresStaff, // Updated naming
    serviceRequiresBath: requiresBath, // Updated naming
    serviceRequiresVet: requiresVet,
    serviceRequirementsLoaded,
    serviceRequirements,
    isBathOnlyService, // NEW: Expose bath-only detection
    
    // ✅ CLEAN: Expose slot validation
    isSelectedSlotValid,
    
    // Actions
    handleNextAvailableSelect,
    handleSubmit,
    fetchServices,
  };
};
