
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

  // Track available time slots
  useEffect(() => {
    const availableCount = timeSlots.filter(s => s.available).length;
    if (availableCount === 0 && timeSlots.length > 0) {
      console.log('[APPOINTMENT] No available slots found for selected date/staff');
    }
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
      const requiresStaff = selectedService.requires_grooming || selectedService.requires_vet || selectedService.requires_bath;
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
    
    // Deduplicate staff IDs to prevent double-checking same staff
    const uniqueStaffIds = [...new Set(staffIds)];
    
    return uniqueStaffIds;
  }, [selectedStaff, selectedGroomerId]);

  // Memoize the staff IDs as a string for stable dependency comparison
  const staffIdsKey = useMemo(() => {
    return getSelectedStaffIds.sort().join(',');
  }, [getSelectedStaffIds]);

  // Only fetch time slots when we have ALL required data
  useEffect(() => {
    // Only fetch on step 3 (date/time selection) and when we have ALL required data
    if (formStep !== 3 || !date || !selectedService) {
      return;
    }

    // If service requires staff, make sure staff is selected
    if (serviceRequiresStaff && getSelectedStaffIds.length === 0) {
      return;
    }

    // Now we have all required data - fetch time slots
    const staffIds = serviceRequiresStaff ? getSelectedStaffIds : [];
    fetchTimeSlots(date, staffIds, setIsLoading, selectedService);
  }, [date, staffIdsKey, selectedService, serviceRequiresStaff, fetchTimeSlots, formStep]);

  const handleNextAvailableSelect = useCallback(() => {
    if (nextAvailable) {
      setDate(new Date(nextAvailable.date));
      setSelectedTimeSlotId(nextAvailable.time);
      setActiveTab('calendar');
    }
  }, [nextAvailable]);

  const handleSubmit = useCallback(async (e: React.FormEvent, selectedStaffIds?: string[]) => {
    e.preventDefault();
    
    // Starting booking submission
    
    if (!user || !selectedPet || !selectedService || !date || !selectedTimeSlotId) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Get staff IDs - use parameter if provided, otherwise get from state
    const rawStaffIds = selectedStaffIds || getSelectedStaffIds;
    // Deduplicate staff IDs at the very start of booking
    const uniqueStaffIds = [...new Set(rawStaffIds)];

    try {
      setIsLoading(true);
      
      // Start minimum loading time (1.5 seconds)
      const minimumLoadingTime = new Promise(resolve => setTimeout(resolve, 1500));
      
      // Debug status values first
      await debugAppointmentStatus();
      await debugServiceStatus();
      
      // Preparing booking details

      // Get client_id from user_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
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

      // Creating appointment

      const bookingPromise = (async () => {
        // Use the atomic create_booking_atomic function with calculated values
        const { data: appointmentId, error: atomicError } = await supabase.rpc('create_booking_atomic', {
          _user_id: user.id,
          _pet_id: selectedPet.id,
          _service_id: selectedService.id,
          _provider_ids: uniqueStaffIds,
          _booking_date: dateStr,
          _time_slot: selectedTimeSlotId,
          _notes: notes || null,
          _calculated_price: pricing?.price || selectedService.base_price || 0,
          _calculated_duration: pricing?.duration || selectedService.default_duration || 60
        });

        if (atomicError || !appointmentId) {
          throw new Error(`Erro ao criar agendamento: ${atomicError?.message || 'Erro desconhecido'}`);
        }

        // Fetch the created appointment details for response
        const { data: appointment, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();

        if (fetchError || !appointment) {
          // Still return appointmentId since booking was successful
          return { id: appointmentId };
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

      // Booking completed successfully
      
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
      console.error('Booking error:', error);
      
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
