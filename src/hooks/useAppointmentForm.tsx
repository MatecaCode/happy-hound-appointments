import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useAppointmentData } from './useAppointmentData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePricing } from './usePricing';
import { debugAppointmentStatus, debugServiceStatus } from '@/utils/debugAppointmentStatus';
import { useNavigate } from 'react-router-dom';

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
    
    console.log('🚀 [BOOKING_SUBMIT] Starting submission process...');
    
    if (!user || !selectedPet || !selectedService || !date || !selectedTimeSlotId) {
      console.error('❌ [BOOKING_SUBMIT] Missing required fields:', {
        user: !!user,
        pet: !!selectedPet,
        service: !!selectedService,
        date: !!date,
        timeSlot: !!selectedTimeSlotId
      });
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsLoading(true);
      
      // Debug status values first
      await debugAppointmentStatus();
      await debugServiceStatus();
      
      console.log('📋 [BOOKING_SUBMIT] Booking details:', {
        user: user.id,
        pet: selectedPet.name,
        service: selectedService.name,
        date: date.toISOString().split('T')[0],
        time: selectedTimeSlotId,
        staffIds: selectedStaffIds || []
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

      console.log('✅ [BOOKING_SUBMIT] Client found:', clientData.id);

      // Prepare appointment data - ALWAYS use 'pending' status initially
      const dateStr = date.toISOString().split('T')[0];
      const serviceDuration = pricing?.duration || selectedService.default_duration || 60;
      
      const appointmentData = {
        client_id: clientData.id,
        pet_id: selectedPet.id,
        service_id: selectedService.id,
        date: dateStr,
        time: selectedTimeSlotId,
        notes: notes || null,
        status: 'pending', // ALWAYS start with pending
        service_status: 'not_started', // ALWAYS start with not_started
        duration: serviceDuration,
        total_price: pricing?.price || selectedService.base_price || 0
      };

      console.log('📝 [BOOKING_SUBMIT] Creating appointment with data:', appointmentData);

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

      // Link staff members if they exist
      if (selectedStaffIds && selectedStaffIds.length > 0) {
        console.log('🔗 [BOOKING_SUBMIT] Linking staff members:', selectedStaffIds);
        
        // Remove duplicates from staff IDs
        const uniqueStaffIds = [...new Set(selectedStaffIds)];
        
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
            // Continue - don't fail the whole booking
          } else {
            console.log('✅ [BOOKING_SUBMIT] Staff linked:', staffId);
          }
        }

        // Update staff availability - mark time slots as unavailable
        console.log('🔒 [BOOKING_SUBMIT] Updating staff availability...');

        for (const staffId of uniqueStaffIds) {
          // Calculate all time slots needed for this service duration
          const slotsToUpdate = [];
          for (let offset = 0; offset < serviceDuration; offset += 30) {
            const slotTime = new Date(`1970-01-01T${selectedTimeSlotId}`);
            slotTime.setMinutes(slotTime.getMinutes() + offset);
            const timeStr = slotTime.toTimeString().split(' ')[0]; // Format: HH:MM:SS
            slotsToUpdate.push(timeStr);
          }

          console.log('🔒 [BOOKING_SUBMIT] Slots to mark unavailable:', slotsToUpdate);

          // Update each time slot
          for (const timeSlot of slotsToUpdate) {
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
              // Continue - don't fail the booking for availability issues
            } else {
              console.log('✅ [BOOKING_SUBMIT] Marked unavailable:', { staffId, timeSlot });
            }
          }
        }
      }

      // Success! Show confirmation message
      toast.success('Agendamento criado com sucesso! Aguardando aprovação da clínica.', {
        duration: 4000,
        style: {
          background: '#10B981',
          color: 'white',
          border: 'none'
        }
      });

      console.log('🎉 [BOOKING_SUBMIT] Booking completed successfully!');
      
      // Reset form
      setSelectedPet(null);
      setSelectedService(null);
      setDate(undefined);
      setSelectedTimeSlotId(null);
      setSelectedGroomerId(null);
      setNotes('');
      setFormStep(1);
      
      // Redirect to booking success page with appointment ID
      navigate(`/booking-success?id=${appointment.id}`);
      
    } catch (error: any) {
      console.error('❌ [BOOKING_SUBMIT] Fatal error:', error);
      
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
  }, [user, selectedPet, selectedService, date, selectedTimeSlotId, selectedGroomerId, notes, serviceRequiresStaff, pricing, navigate]);

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
