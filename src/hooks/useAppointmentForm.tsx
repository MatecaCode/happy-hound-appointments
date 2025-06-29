
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
      valid_slot: validSlot
    });
    return Boolean(validSlot);
  }, [formState.selectedTimeSlotId, timeSlots]);

  // 🔒 CRITICAL: Reset selected slot if it becomes invalid
  React.useEffect(() => {
    if (formState.selectedTimeSlotId && !isSelectedSlotValid) {
      console.log('⚠️ [APPOINTMENT_FORM] Selected slot is no longer valid, clearing selection');
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
    }
  }, [formState.selectedService, formState.selectedGroomerId, formState.date]);

  // Handle next available appointment selection
  const handleNextAvailableSelect = () => {
    if (nextAvailable) {
      formState.setDate(new Date(nextAvailable.date));
      formState.setSelectedTimeSlotId(nextAvailable.time);
      formState.setActiveTab('calendar');
    }
  };

  // ENHANCED SUBMIT with comprehensive logging
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 [APPOINTMENT_FORM] SUBMIT: Starting validation with current state:', {
      selected_slot: formState.selectedTimeSlotId,
      is_slot_valid: isSelectedSlotValid,
      available_slots: timeSlots.map(s => ({ id: s.id, available: s.available })),
      last_fetched_slots: (window as any).lastFetchedSlots,
      timestamp: new Date().toISOString()
    });
    
    // 🔒 CRITICAL: Final validation before submission
    if (!isSelectedSlotValid) {
      console.error('❌ [APPOINTMENT_FORM] SUBMIT BLOCKED: Selected slot is not valid');
      toast.error('Horário selecionado não está mais disponível');
      return;
    }

    const selectedSlot = timeSlots.find(slot => slot.id === formState.selectedTimeSlotId);
    if (!selectedSlot) {
      console.error('❌ [APPOINTMENT_FORM] SUBMIT BLOCKED: Selected slot not found in current slots');
      toast.error('Horário selecionado não foi encontrado');
      return;
    }

    // 🔒 CRITICAL: Validate against last fetched slots
    const lastFetchedSlots = (window as any).lastFetchedSlots;
    if (!Array.isArray(lastFetchedSlots) || !lastFetchedSlots.some(slot => slot.time_slot === formState.selectedTimeSlotId)) {
      console.error('❌ [APPOINTMENT_FORM] SUBMIT BLOCKED: Selected slot not in last fetched slots');
      toast.error('Horário não foi validado pelo sistema. Selecione novamente.');
      return;
    }
    
    console.log('🚀 [APPOINTMENT_FORM] SUBMIT: Starting form submission with validated slot:', {
      user_id: user?.id,
      selected_pet: formState.selectedPet,
      selected_service: formState.selectedService,
      selected_groomer_user_id: formState.selectedGroomerId,
      date: formState.date?.toISOString(),
      time_slot: formState.selectedTimeSlotId,
      time_slot_value: selectedSlot.time,
      notes: formState.notes,
      requires_groomer: requiresGroomer,
      is_shower_only: isShowerOnlyService,
      service_requirements: serviceRequirements,
      slot_validation: {
        is_valid: isSelectedSlotValid,
        slot_exists: Boolean(selectedSlot),
        slot_available: selectedSlot?.available,
        in_fetched_slots: Array.isArray(lastFetchedSlots) && lastFetchedSlots.some(slot => slot.time_slot === formState.selectedTimeSlotId)
      },
      timestamp: new Date().toISOString()
    });
    
    if (!user) {
      console.log('❌ [APPOINTMENT_FORM] No user, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (!formState.selectedPet || !formState.selectedService || !formState.date || !formState.selectedTimeSlotId) {
      console.log('❌ [APPOINTMENT_FORM] Missing required fields for submission:', {
        has_pet: !!formState.selectedPet,
        has_service: !!formState.selectedService,
        has_date: !!formState.date,
        has_time_slot: !!formState.selectedTimeSlotId
      });
      return;
    }

    // Only require groomer if service requires one (not for shower-only services)
    if (requiresGroomer && !formState.selectedGroomerId) {
      console.log('❌ [APPOINTMENT_FORM] Service requires groomer but none selected');
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
        last_fetched_validation: Array.isArray(lastFetchedSlots) && lastFetchedSlots.some(slot => slot.time_slot === formState.selectedTimeSlotId)
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

    console.log('📨 [APPOINTMENT_FORM] SUBMIT: createAppointment result:', result);

    if (result.success && result.bookingData) {
      console.log('🎉 [APPOINTMENT_FORM] SUBMIT: Success! Navigating to booking-success');
      navigate('/booking-success', { 
        state: { bookingData: result.bookingData } 
      });
    } else {
      console.log('❌ [APPOINTMENT_FORM] SUBMIT: Booking failed, staying on form');
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
