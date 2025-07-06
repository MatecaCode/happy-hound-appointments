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

  // Fetch providers when service changes
  useEffect(() => {
    if (selectedService && serviceRequiresStaff) {
      fetchAvailableProviders(serviceType, new Date(), selectedService);
    }
  }, [selectedService, serviceType, serviceRequiresStaff, fetchAvailableProviders]);

  // Fetch time slots when date/staff changes
  useEffect(() => {
    if (date && selectedService && formStep === 3) {
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedPet || !selectedService || !date || !selectedTimeSlotId) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsLoading(true);

      // Get client_id from user_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        toast.error('Erro ao encontrar dados do cliente');
        return;
      }

      // Prepare appointment data
      const appointmentData = {
        client_id: clientData.id,
        pet_id: selectedPet.id,
        service_id: selectedService.id,
        date: date.toISOString().split('T')[0],
        time: selectedTimeSlotId,
        notes: notes || null,
        status: 'pending',
        duration: pricing?.duration || selectedService.default_duration || 60,
        total_price: pricing?.price || selectedService.base_price || 0
      };

      console.log('🚀 [APPOINTMENT_SUBMIT] Creating appointment with data:', appointmentData);

      // Create the appointment
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [APPOINTMENT_SUBMIT] Appointment created:', appointment);

      // If service requires staff, link the staff member using appointment_staff
      if (serviceRequiresStaff && selectedGroomerId && appointment) {
        console.log('🔗 [APPOINTMENT_SUBMIT] Linking staff member:', selectedGroomerId);
        
        const { error: staffError } = await supabase
          .from('appointment_staff')
          .insert({
            appointment_id: appointment.id,
            staff_profile_id: selectedGroomerId,
            role: 'primary'
          });

        if (staffError) {
          console.error('❌ [APPOINTMENT_SUBMIT] Error linking staff:', staffError);
          // Don't fail the whole appointment for this
          toast.error('Agendamento criado, mas houve erro ao vincular profissional');
        } else {
          console.log('✅ [APPOINTMENT_SUBMIT] Staff successfully linked');
        }
      }

      toast.success('Agendamento criado com sucesso!');
      
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
      toast.error('Erro ao criar agendamento: ' + error.message);
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
