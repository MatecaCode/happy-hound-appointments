
import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAppointmentFormState } from './useAppointmentFormState';
import { useAppointmentData } from './useAppointmentData';
import { useServiceRequirements } from './useServiceRequirements';
import { createAppointment } from '@/utils/appointmentUtils';

export interface Provider {
  id: string;
  name: string;
  role: string;
  profile_image?: string;
  rating?: number;
  specialty?: string;
  about?: string;
  provider_profile_id?: string; // Add this to track the actual provider profile ID
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

  console.log('🔍 DEBUG: Service requirements from view:', {
    service_id: formState.selectedService,
    requirements: serviceRequirements,
    requires_groomer: requiresGroomer,
    requires_shower: requiresShower,
    requires_vet: requiresVet,
    combo: serviceRequirements?.combo
  });

  // Clear selected groomer if service doesn't require one
  useEffect(() => {
    if (serviceRequirementsLoaded && !requiresGroomer && formState.selectedGroomerId) {
      console.log('🔍 DEBUG: Service does not require groomer, clearing selected groomer');
      formState.setSelectedGroomerId('');
    }
  }, [requiresGroomer, serviceRequirementsLoaded, formState.selectedGroomerId, formState]);

  // Handle next available appointment selection
  const handleNextAvailableSelect = () => {
    if (nextAvailable) {
      formState.setDate(new Date(nextAvailable.date));
      formState.setSelectedTimeSlotId(nextAvailable.time);
      formState.setActiveTab('calendar');
    }
  };

  // Submit appointment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!formState.selectedPet || !formState.selectedService || !formState.date || !formState.selectedTimeSlotId) {
      console.log('🔍 DEBUG: Missing required fields for submission');
      return;
    }

    // Only require groomer if service requires one
    if (requiresGroomer && !formState.selectedGroomerId) {
      console.log('🔍 DEBUG: Service requires groomer but none selected');
      return;
    }

    console.log('🔍 DEBUG: Submitting appointment:', {
      service_requires_groomer: requiresGroomer,
      service_requires_shower: requiresShower,
      service_requires_vet: requiresVet,
      selected_groomer: formState.selectedGroomerId,
      service: formState.selectedService,
      combo: serviceRequirements?.combo
    });

    // CRITICAL FIX: Pass the correct user_id to createAppointment
    // The createAppointment function will handle the user_id -> provider_profile_id conversion
    formState.setIsLoading(true);
    
    const result = await createAppointment(
      user.id,
      formState.selectedPet,
      formState.selectedService,
      requiresGroomer ? formState.selectedGroomerId : null, // This is user_id
      formState.date,
      formState.selectedTimeSlotId,
      formState.notes
    );

    if (result.success && result.bookingData) {
      // Navigate to success page with booking data
      navigate('/booking-success', { 
        state: { bookingData: result.bookingData } 
      });
    }
    
    formState.setIsLoading(false);
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      fetchUserPets(user.id);
    }
  }, [user, fetchUserPets]);

  // Fetch available providers when date changes and service requires groomer
  useEffect(() => {
    if (formState.formStep === 3 && formState.date && requiresGroomer && serviceRequirementsLoaded) {
      console.log('🔍 DEBUG: useEffect triggered for step 3, date:', formState.date);
      console.log('🔍 DEBUG: Selected service:', selectedServiceObj);
      fetchAvailableProviders(serviceType, formState.date, selectedServiceObj);
    }
  }, [formState.formStep, formState.date, serviceType, selectedServiceObj, fetchAvailableProviders, requiresGroomer, serviceRequirementsLoaded]);

  // Fetch time slots for final step
  useEffect(() => {
    // Final step is step 3 (no groomer) or step 4 (with groomer)
    const isFinalStep = (formState.formStep === 3 && !requiresGroomer) || (formState.formStep === 4);
    
    if (isFinalStep && formState.date && serviceRequirementsLoaded) {
      // For shower-only services, pass null as groomer ID
      const groomerId = requiresGroomer ? formState.selectedGroomerId : null;
      console.log('🔍 DEBUG: Fetching time slots for final step:', {
        step: formState.formStep,
        is_final_step: isFinalStep,
        requires_groomer: requiresGroomer,
        requires_shower: requiresShower,
        groomer_id: groomerId
      });
      fetchTimeSlots(formState.date, groomerId, formState.setIsLoading, selectedServiceObj);
    }
  }, [formState.formStep, formState.date, formState.selectedGroomerId, selectedServiceObj, fetchTimeSlots, requiresGroomer, requiresShower, serviceRequirementsLoaded]);

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
    serviceRequirements, // Full requirements object for advanced use
    
    // Actions
    handleNextAvailableSelect,
    handleSubmit,
    fetchServices,
  };
};
