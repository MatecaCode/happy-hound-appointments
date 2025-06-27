
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

  // Check if the selected service requires a groomer
  const serviceRequiresGroomer = useCallback(async () => {
    if (!formState.selectedService) return false;
    
    try {
      const { data, error } = await supabase
        .from('service_resources')
        .select('provider_type')
        .eq('service_id', formState.selectedService)
        .eq('resource_type', 'provider')
        .eq('provider_type', 'groomer');

      if (error) {
        console.error('Error checking service requirements:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking if service requires groomer:', error);
      return false;
    }
  }, [formState.selectedService]);

  // State to track if current service requires groomer
  const [requiresGroomer, setRequiresGroomer] = React.useState(false);

  // Check service requirements when service changes
  useEffect(() => {
    const checkRequirements = async () => {
      const requires = await serviceRequiresGroomer();
      setRequiresGroomer(requires);
      console.log('🔍 DEBUG: Service requires groomer:', requires, 'for service:', formState.selectedService);
    };
    
    if (formState.selectedService) {
      checkRequirements();
    }
  }, [formState.selectedService, serviceRequiresGroomer]);

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
      return;
    }

    // Only require groomer if service requires one
    if (requiresGroomer && !formState.selectedGroomerId) {
      return;
    }

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

  // Fetch available providers when date changes (for step 3) - only if groomer is required
  useEffect(() => {
    if (formState.formStep === 3 && formState.date && requiresGroomer) {
      console.log('🔍 DEBUG: useEffect triggered for step 3, date:', formState.date);
      console.log('🔍 DEBUG: Selected service:', selectedServiceObj);
      fetchAvailableProviders(serviceType, formState.date, selectedServiceObj);
    }
  }, [formState.formStep, formState.date, serviceType, selectedServiceObj, fetchAvailableProviders, requiresGroomer]);

  // Fetch time slots when date changes (for step 4) or when groomer changes (if required)
  useEffect(() => {
    if (formState.formStep === 4) {
      // For shower-only services, pass null as groomer ID
      const groomerId = requiresGroomer ? formState.selectedGroomerId : null;
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
