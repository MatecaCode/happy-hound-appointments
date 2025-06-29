import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAppointmentFormState } from './useAppointmentFormState';
import { useAppointmentData } from './useAppointmentData';
import { useServiceRequirements } from './useServiceRequirements';
import { createAppointment } from '@/utils/appointmentUtils';
import { toast } from 'sonner';

export interface Provider {
  id: string;
  name: string;
  role: string;
  profile_image?: string;
  rating?: number;
  specialty?: string;
  about?: string;
  provider_profile_id?: string; // Store the actual provider profile ID
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
  price: number;
  duration: number;
  service_type: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface NextAvailable {
  date: string;
  time: string;
  provider_name: string;
}

export const useAppointmentForm = (serviceType: 'grooming' | 'veterinary') => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Use the separated hooks
  const formState = useAppointmentFormState();
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

  // Use the new centralized service requirements hook
  const { getServiceRequirements } = useServiceRequirements();

  // Get the currently selected service object
  const selectedServiceObj = services.find(s => s.id === formState.selectedService);

  // Get service requirements from the centralized hook
  const serviceRequirements = formState.selectedService 
    ? getServiceRequirements(formState.selectedService)
    : null;

  // Extract requirements from the centralized data
  const requiresGroomer = serviceRequirements?.requires_groomer || false;
  const requiresShower = serviceRequirements?.requires_shower || false;
  const requiresVet = serviceRequirements?.requires_vet || false;
  const serviceRequirementsLoaded = Boolean(serviceRequirements);

  // NEW: Check if service is shower-only
  const isShowerOnlyService = serviceRequirementsLoaded && 
    requiresShower && 
    !requiresGroomer && 
    !requiresVet;

  console.log('🔍 [APPOINTMENT_FORM] Service requirements analysis:', {
    service_id: formState.selectedService,
    requirements: serviceRequirements,
    requires_groomer: requiresGroomer,
    requires_shower: requiresShower,
    requires_vet: requiresVet,
    is_shower_only: isShowerOnlyService
  });

  // 🔒 CRITICAL: Validate selected time slot is in available slots  
  const isSelectedSlotValid = React.useMemo(() => {
    if (!formState.selectedTimeSlotId) return false;
    const validSlot = timeSlots.find(slot => 
      slot.id === formState.selectedTimeSlotId && slot.available
    );
    console.log('🔒 [APPOINTMENT_FORM] Slot validation:', {
      selected_slot: formState.selectedTimeSlotId,
      available_slots: timeSlots.map(s => s.id),
      is_valid: Boolean(validSlot),
      valid_slot: validSlot,
      last_fetched_slots: (window as any).lastFetchedSlots,
      slot_in_fetched: Array.isArray((window as any).lastFetchedSlots) && 
        (window as any).lastFetchedSlots.some(slot => slot.time_slot === formState.selectedTimeSlotId)
    });
    return Boolean(validSlot);
  }, [formState.selectedTimeSlotId, timeSlots]);

  // 🔒 CRITICAL: Reset selected slot if it becomes invalid
  React.useEffect(() => {
    if (formState.selectedTimeSlotId && !isSelectedSlotValid) {
      console.log('⚠️ [APPOINTMENT_FORM] Selected slot is no longer valid, clearing selection');
      toast.warning('Horário selecionado não está mais disponível. Selecione novamente.');
      formState.setSelectedTimeSlotId('');
    }
  }, [isSelectedSlotValid, formState.selectedTimeSlotId, formState]);

  // Clear selected groomer if service doesn't require one
  useEffect(() => {
    if (serviceRequirementsLoaded && !requiresGroomer && formState.selectedGroomerId) {
      console.log('🔍 [APPOINTMENT_FORM] Service does not require groomer, clearing selected groomer');
      formState.setSelectedGroomerId('');
    }
  }, [requiresGroomer, serviceRequirementsLoaded, formState.selectedGroomerId, formState]);

  // 🔒 CRITICAL: Reset time slot when dependencies change - WITH ENHANCED LOGGING
  React.useEffect(() => {
    console.log('🔄 [APPOINTMENT_FORM] Dependency change detected:', {
      service: formState.selectedService,
      groomer: formState.selectedGroomerId,
      date: formState.date?.toISOString(),
      current_slot: formState.selectedTimeSlotId,
      will_clear_slot: Boolean(formState.selectedTimeSlotId)
    });
    
    // Reset time slot when service, groomer, or date changes
    if (formState.selectedTimeSlotId) {
      console.log('🔄 [APPOINTMENT_FORM] Dependencies changed, clearing time slot selection');
      formState.setSelectedTimeSlotId('');
      
      // 🔒 CRITICAL: Clear stored slot data to prevent stale validation
      (window as any).lastFetchedSlots = null;
      (window as any).lastFetchParams = null;
      
      // Show user feedback about slot reset
      toast.info('Seleção de horário foi resetada devido à mudança de parâmetros');
    }
  }, [formState.selectedService, formState.selectedGroomerId, formState.date]);

  // 🔒 NEW: Watch timeSlots changes and validate selected slot
  React.useEffect(() => {
    console.log('🕐 [APPOINTMENT_FORM] Time slots updated:', {
      slots_count: timeSlots.length,
      available_count: timeSlots.filter(s => s.available).length,
      selected_slot: formState.selectedTimeSlotId,
      selected_slot_exists: timeSlots.some(s => s.id === formState.selectedTimeSlotId),
      selected_slot_available: timeSlots.some(s => s.id === formState.selectedTimeSlotId && s.available)
    });

    // If selected slot is not in the new slots list, clear it
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

  // ENHANCED SUBMIT with comprehensive logging and error handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 [APPOINTMENT_FORM] SUBMIT: Starting validation with current state:', {
      selected_slot: formState.selectedTimeSlotId,
      is_slot_valid: isSelectedSlotValid,
      available_slots: timeSlots.map(s => ({ id: s.id, available: s.available })),
      last_fetched_slots: (window as any).lastFetchedSlots,
      timestamp: new Date().toISOString()
    });
    
    // 🔒 CRITICAL: Final validation - block if no valid slot selected
    if (!formState.selectedTimeSlotId) {
      console.error('❌ [APPOINTMENT_FORM] SUBMIT BLOCKED: No slot selected');
      toast.error('Por favor, selecione um horário');
      return;
    }

    if (!isSelectedSlotValid) {
      console.error('❌ [APPOINTMENT_FORM] SUBMIT BLOCKED: Selected slot is not valid');
      toast.error('Horário selecionado não está mais disponível. Selecione novamente.');
      return;
    }

    const selectedSlot = timeSlots.find(slot => slot.id === formState.selectedTimeSlotId);
    if (!selectedSlot) {
      console.error('❌ [APPOINTMENT_FORM] SUBMIT BLOCKED: Selected slot not found in current slots');
      toast.error('Horário selecionado não foi encontrado na lista atual');
      return;
    }

    // 🔒 CRITICAL: Double-check against last fetched slots
    const lastFetchedSlots = (window as any).lastFetchedSlots;
    const slotInFetchedList = Array.isArray(lastFetchedSlots) && 
      lastFetchedSlots.some(slot => slot.time_slot === formState.selectedTimeSlotId);
    
    if (!slotInFetchedList) {
      console.error('❌ [APPOINTMENT_FORM] SUBMIT BLOCKED: Selected slot not in last fetched slots');
      console.error('❌ [APPOINTMENT_FORM] Debug info:', {
        selected_slot: formState.selectedTimeSlotId,
        last_fetched_slots: lastFetchedSlots,
        slot_exists_in_fetched: slotInFetchedList
      });
      toast.error('Horário não foi validado pelo sistema. Por favor, selecione novamente.');
      return;
    }
    
    console.log('🚀 [APPOINTMENT_FORM] SUBMIT: All validations passed, proceeding with booking');
    
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

    // Only require groomer if service requires one (not for shower-only services)
    if (requiresGroomer && !formState.selectedGroomerId) {
      console.log('❌ [APPOINTMENT_FORM] Service requires groomer but none selected');
      toast.error('Por favor, selecione um profissional');
      return;
    }

    // CRITICAL: Get the provider_profile_id from the selected groomer
    let providerProfileId: string | null = null;
    if (requiresGroomer && formState.selectedGroomerId) {
      const selectedGroomer = groomers.find(g => g.id === formState.selectedGroomerId);
      providerProfileId = (selectedGroomer as any)?.provider_profile_id || null;
      
      console.log('🎯 [APPOINTMENT_FORM] SUBMIT: Provider ID mapping for submission:', {
        groomer_user_id: formState.selectedGroomerId,
        provider_profile_id: providerProfileId,
        selected_groomer: selectedGroomer
      });

      if (!providerProfileId) {
        console.error('❌ [APPOINTMENT_FORM] CRITICAL: No provider_profile_id found for selected groomer');
        toast.error('Erro: ID do profissional não encontrado');
        return;
      }
    }

    formState.setIsLoading(true);
    
    // 🔥 CRITICAL DEBUG: Final payload logging with slot validation
    console.log('📤 [APPOINTMENT_FORM] 🔥 FINAL PAYLOAD TO createAppointment:', {
      user_id: user.id,
      pet_id: formState.selectedPet,
      service_id: formState.selectedService,
      provider_profile_id: providerProfileId,
      date: formState.date,
      time_slot: formState.selectedTimeSlotId,
      time_slot_actual_value: selectedSlot.time,
      notes: formState.notes,
      final_validation: {
        slot_in_available_list: isSelectedSlotValid,
        available_slots_count: timeSlots.filter(s => s.available).length,
        selected_slot_details: selectedSlot,
        last_fetched_validation: slotInFetchedList,
        all_checks_passed: true
      }
    });

    // Pass the provider_profile_id directly (not user_id)
    const result = await createAppointment(
      user.id,
      formState.selectedPet,
      formState.selectedService,
      providerProfileId, // Pass provider_profile_id directly
      formState.date,
      formState.selectedTimeSlotId,
      formState.notes
    );

    console.log('📨 [APPOINTMENT_FORM] SUBMIT: createAppointment result:', {
      ...result,
      error_details: result.error ? {
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
        code: result.error.code
      } : null
    });

    if (result.success && result.bookingData) {
      console.log('🎉 [APPOINTMENT_FORM] SUBMIT: Success! Navigating to booking-success');
      navigate('/booking-success', { 
        state: { bookingData: result.bookingData } 
      });
    } else {
      console.log('❌ [APPOINTMENT_FORM] SUBMIT: Booking failed with error:', result.error);
      
      // Display detailed error information for debugging
      if (result.error) {
        console.error('💥 [APPOINTMENT_FORM] DETAILED ERROR:', {
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code,
          fullError: result.error
        });
        
        // Show a more specific toast based on the error
        if (result.error.message) {
          toast.error(`Erro detalhado: ${result.error.message}`);
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

  // NEW: Handle shower-only services - skip to step 4 directly
  useEffect(() => {
    if (isShowerOnlyService && formState.formStep === 2 && formState.date) {
      console.log('🚿 [APPOINTMENT_FORM] Shower-only service detected, skipping to step 4');
      formState.setFormStep(4); // Skip groomer selection, go directly to time slots
    }
  }, [isShowerOnlyService, formState.formStep, formState.date, formState]);

  // Fetch available providers when date changes and service requires groomer
  useEffect(() => {
    if (formState.formStep === 3 && formState.date && requiresGroomer && serviceRequirementsLoaded && !isShowerOnlyService) {
      console.log('🔍 [APPOINTMENT_FORM] useEffect triggered for step 3 provider fetch');
      fetchAvailableProviders(serviceType, formState.date, selectedServiceObj);
    }
  }, [formState.formStep, formState.date, serviceType, selectedServiceObj, fetchAvailableProviders, requiresGroomer, serviceRequirementsLoaded, isShowerOnlyService]);

  // Fetch time slots for final step
  useEffect(() => {
    // Final step is step 4 (with/without groomer) OR step 3 for shower-only
    const isFinalStep = formState.formStep === 4 || (isShowerOnlyService && formState.formStep === 3);
    
    if (isFinalStep && formState.date && serviceRequirementsLoaded) {
      console.log('🔍 [APPOINTMENT_FORM] useEffect triggered for time slots fetch:', {
        step: formState.formStep,
        is_final_step: isFinalStep,
        requires_groomer: requiresGroomer,
        is_shower_only: isShowerOnlyService,
        groomer_user_id: formState.selectedGroomerId,
        date: formState.date
      });
      
      // Pass user_id to fetchTimeSlots - it will handle the conversion internally
      fetchTimeSlots(formState.date, formState.selectedGroomerId, formState.setIsLoading, selectedServiceObj);
    }
  }, [formState.formStep, formState.date, formState.selectedGroomerId, selectedServiceObj, fetchTimeSlots, requiresGroomer, serviceRequirementsLoaded, isShowerOnlyService]);

  return {
    // Spread all form state
    ...formState,
    
    // Data state
    timeSlots,
    nextAvailable,
    userPets,
    services,
    groomers,
    
    // Service requirements from centralized hook
    serviceRequiresGroomer: requiresGroomer,
    serviceRequiresShower: requiresShower,
    serviceRequiresVet: requiresVet,
    serviceRequirementsLoaded,
    serviceRequirements,
    isShowerOnlyService, // NEW: Expose shower-only detection
    
    // 🔒 NEW: Expose slot validation
    isSelectedSlotValid,
    
    // Actions
    handleNextAvailableSelect,
    handleSubmit,
    fetchServices,
  };
};
