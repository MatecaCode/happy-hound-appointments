
import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAppointmentFormState } from './useAppointmentFormState';
import { useAppointmentData } from './useAppointmentData';
import { createAppointment } from '@/utils/appointmentUtils';
import { supabase } from '@/integrations/supabase/client';

export interface Provider {
  id: string;
  name: string;
  role: string;
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

  // Get the currently selected service object
  const selectedServiceObj = services.find(s => s.id === formState.selectedService);

  // State to track if current service requires groomer
  const [requiresGroomer, setRequiresGroomer] = React.useState(false);

  // Check if the selected service requires a groomer by querying service_resources
  const checkServiceRequiresGroomer = useCallback(async () => {
    if (!formState.selectedService) return false;
    
    try {
      console.log('🔍 DEBUG: Checking if service requires groomer for service:', formState.selectedService);
      
      const { data, error } = await supabase
        .from('service_resources')
        .select('provider_type, service_name')
        .eq('service_id', formState.selectedService)
        .eq('resource_type', 'provider')
        .eq('provider_type', 'groomer');

      if (error) {
        console.error('Error checking service requirements:', error);
        return false;
      }

      const requiresGroomer = data && data.length > 0;
      console.log('🔍 DEBUG: Service resource check result:', {
        service_id: formState.selectedService,
        service_resources: data,
        requires_groomer: requiresGroomer
      });

      return requiresGroomer;
    } catch (error) {
      console.error('Error checking if service requires groomer:', error);
      return false;
    }
  }, [formState.selectedService]);

  // Check service requirements when service changes
  useEffect(() => {
    const checkRequirements = async () => {
      const requires = await checkServiceRequiresGroomer();
      setRequiresGroomer(requires);
      console.log('🔍 DEBUG: Service requires groomer:', requires, 'for service:', formState.selectedService);
      
      // If service doesn't require groomer, clear any selected groomer
      if (!requires && formState.selectedGroomerId) {
        console.log('🔍 DEBUG: Service does not require groomer, clearing selected groomer');
        formState.setSelectedGroomerId('');
      }

      // Reset form step when service requirements change to avoid inconsistent state
      if (formState.formStep > 2) {
        console.log('🔍 DEBUG: Service requirements changed, resetting to step 2');
        formState.setFormStep(2);
      }
    };
    
    if (formState.selectedService) {
      checkRequirements();
    } else {
      setRequiresGroomer(false);
    }
  }, [formState.selectedService, checkServiceRequiresGroomer, formState]);

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
      selected_groomer: formState.selectedGroomerId,
      service: formState.selectedService
    });

    formState.setIsLoading(true);
    
    const success = await createAppointment(
      user.id,
      formState.selectedPet,
      formState.selectedService,
      requiresGroomer ? formState.selectedGroomerId : null,
      formState.date,
      formState.selectedTimeSlotId,
      formState.notes
    );

    if (success) {
      navigate('/confirmation');
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
    if (formState.formStep === 3 && formState.date && requiresGroomer) {
      console.log('🔍 DEBUG: useEffect triggered for step 3, date:', formState.date);
      console.log('🔍 DEBUG: Selected service:', selectedServiceObj);
      fetchAvailableProviders(serviceType, formState.date, selectedServiceObj);
    }
  }, [formState.formStep, formState.date, serviceType, selectedServiceObj, fetchAvailableProviders, requiresGroomer]);

  // Fetch time slots for final step
  useEffect(() => {
    const isFinalStep = (formState.formStep === 3 && !requiresGroomer) || (formState.formStep === 4 && requiresGroomer);
    
    if (isFinalStep && formState.date) {
      // For shower-only services, pass null as groomer ID
      const groomerId = requiresGroomer ? formState.selectedGroomerId : null;
      console.log('🔍 DEBUG: Fetching time slots for final step:', {
        step: formState.formStep,
        is_final_step: isFinalStep,
        requires_groomer: requiresGroomer,
        groomer_id: groomerId
      });
      fetchTimeSlots(formState.date, groomerId, formState.setIsLoading, selectedServiceObj);
    }
  }, [formState.formStep, formState.date, formState.selectedGroomerId, selectedServiceObj, fetchTimeSlots, requiresGroomer]);

  return {
    // Spread all form state
    ...formState,
    
    // Data state
    timeSlots,
    nextAvailable,
    userPets,
    services,
    groomers,
    
    // Service requirements
    serviceRequiresGroomer: requiresGroomer,
    
    // Actions
    handleNextAvailableSelect,
    handleSubmit,
    fetchServices,
  };
};
