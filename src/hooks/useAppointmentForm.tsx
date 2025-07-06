
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useAppointmentData } from './useAppointmentData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePricing } from './usePricing';

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

  // Fetch time slots when date/staff changes - but only if we're on the date/time step
  useEffect(() => {
    if (date && selectedService && (formStep === 3 || (formStep === 2 && !serviceRequiresStaff))) {
      const staffId = serviceRequiresStaff ? selectedGroomerId : null;
      fetchTimeSlots(date, staffId, setIsLoading, selectedService);
    }
  }, [date, selectedGroomerId, selectedService, serviceRequiresStaff, fetchTimeSlots, formStep]);

  const handleNextAvailableSelect = useCallback(() => {
    if (nextAvailable) {
      setDate(new Date(nextAvailable.date));
      setSelectedTimeSlotId(nextAvailable.time);
      setActiveTab('calendar');
    }
  }, [nextAvailable]);

  const handleSubmit = useCallback(async (e: React.FormEvent, selectedStaffIds?: string[]) => {
    e.preventDefault();
    
    if (!user || !selectedPet || !selectedService || !date || !selectedTimeSlotId) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    console.log('🚀 [APPOINTMENT_SUBMIT] Starting booking process:', {
      user: user.id,
      pet: selectedPet.name,
      service: selectedService.name,
      date: date.toISOString().split('T')[0],
      time: selectedTimeSlotId,
      staffIds: selectedStaffIds
    });

    try {
      setIsLoading(true);

      // Start a transaction-like approach
      const dateStr = date.toISOString().split('T')[0];
      const serviceDuration = pricing?.duration || selectedService.default_duration || 60;

      // Get client_id from user_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        throw new Error('Erro ao encontrar dados do cliente');
      }

      console.log('✅ [APPOINTMENT_SUBMIT] Client found:', clientData.id);

      // Create the appointment
      const appointmentData = {
        client_id: clientData.id,
        pet_id: selectedPet.id,
        service_id: selectedService.id,
        date: dateStr,
        time: selectedTimeSlotId,
        notes: notes || null,
        status: 'pending',
        service_status: 'not_started',
        duration: serviceDuration,
        total_price: pricing?.price || selectedService.base_price || 0
      };

      console.log('📝 [APPOINTMENT_SUBMIT] Creating appointment with data:', appointmentData);

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) throw appointmentError;
      if (!appointment) throw new Error('Falha ao criar agendamento');

      console.log('✅ [APPOINTMENT_SUBMIT] Appointment created:', appointment.id);

      // Link staff members if they exist
      if (selectedStaffIds && selectedStaffIds.length > 0) {
        console.log('🔗 [APPOINTMENT_SUBMIT] Linking', selectedStaffIds.length, 'staff members');
        
        for (const staffId of selectedStaffIds) {
          const { error: staffLinkError } = await supabase
            .from('appointment_staff')
            .insert({
              appointment_id: appointment.id,
              staff_profile_id: staffId,
              role: 'primary'
            });

          if (staffLinkError) {
            console.error('❌ [APPOINTMENT_SUBMIT] Error linking staff:', staffId, staffLinkError);
            // Continue with other staff, don't fail the whole appointment
          } else {
            console.log('✅ [APPOINTMENT_SUBMIT] Staff linked:', staffId);
          }
        }

        // Update staff availability - mark time slots as unavailable
        console.log('🔒 [APPOINTMENT_SUBMIT] Updating staff availability for', serviceDuration, 'minutes');

        for (const staffId of selectedStaffIds) {
          // Calculate all time slots needed for this service duration
          const slotsToUpdate = [];
          for (let offset = 0; offset < serviceDuration; offset += 30) {
            const slotTime = new Date(`1970-01-01T${selectedTimeSlotId}`);
            slotTime.setMinutes(slotTime.getMinutes() + offset);
            const timeStr = slotTime.toTimeString().split(' ')[0]; // Format: HH:MM:SS
            slotsToUpdate.push(timeStr);
          }

          console.log('🔒 [APPOINTMENT_SUBMIT] Marking unavailable for staff', staffId, ':', slotsToUpdate);

          // Update each time slot
          for (const timeSlot of slotsToUpdate) {
            const { error: availabilityError } = await supabase
              .from('staff_availability')
              .update({ available: false })
              .eq('staff_profile_id', staffId)
              .eq('date', dateStr)
              .eq('time_slot', timeSlot);

            if (availabilityError) {
              console.error('⚠️ [APPOINTMENT_SUBMIT] Failed to update availability for', staffId, timeSlot, availabilityError);
              // Continue - don't fail the booking for availability update issues
            } else {
              console.log('✅ [APPOINTMENT_SUBMIT] Marked unavailable:', staffId, timeSlot);
            }
          }
        }
      }

      // Success feedback
      toast.success('Seu agendamento está pendente de aprovação pela clínica. Você receberá uma notificação quando for aprovado.', {
        duration: 5000,
        style: {
          background: '#10B981',
          color: 'white',
          border: 'none'
        }
      });

      console.log('🎉 [APPOINTMENT_SUBMIT] Booking completed successfully');
      
      // Reset form
      setSelectedPet(null);
      setSelectedService(null);
      setDate(undefined);
      setSelectedTimeSlotId(null);
      setSelectedGroomerId(null);
      setNotes('');
      setFormStep(1);
      
    } catch (error: any) {
      console.error('❌ [APPOINTMENT_SUBMIT] Error creating appointment:', error);
      toast.error('Erro ao criar agendamento: ' + (error.message || 'Erro desconhecido'), {
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedPet, selectedService, date, selectedTimeSlotId, selectedGroomerId, notes, serviceRequiresStaff, pricing]);

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
    fetchServices,
    serviceRequiresStaff,
    serviceRequirementsLoaded,
    pricing,
  };
};
