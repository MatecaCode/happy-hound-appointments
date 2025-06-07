
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface AppointmentFormData {
  petName: string;
  ownerName: string;
  service: string;
  serviceId: string;
  groomerId: string;
  date: Date | null;
  time: string;
  notes?: string;
}

export const useAppointmentForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AppointmentFormData>({
    petName: '',
    ownerName: '',
    service: '',
    serviceId: '',
    groomerId: '',
    date: null,
    time: '',
    notes: ''
  });

  const updateFormData = (updates: Partial<AppointmentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const submitAppointment = async (userId: string) => {
    try {
      if (!formData.date || !formData.time || !formData.serviceId || !formData.groomerId) {
        throw new Error('Por favor, preencha todos os campos obrigatórios');
      }

      // First, create or get the pet
      const { data: existingPet, error: petFetchError } = await supabase
        .from('pets')
        .select('id')
        .eq('user_id', userId)
        .eq('name', formData.petName)
        .single();

      let petId: string;
      
      if (petFetchError && petFetchError.code === 'PGRST116') {
        // Pet doesn't exist, create it
        const { data: newPet, error: petCreateError } = await supabase
          .from('pets')
          .insert({
            user_id: userId,
            name: formData.petName
          })
          .select('id')
          .single();

        if (petCreateError) throw petCreateError;
        petId = newPet.id;
      } else if (petFetchError) {
        throw petFetchError;
      } else {
        petId = existingPet.id;
      }

      // Create the appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: userId,
          pet_id: petId,
          pet_name: formData.petName,
          service_id: formData.serviceId,
          service: formData.service,
          provider_id: formData.groomerId,
          date: formData.date.toISOString().split('T')[0],
          time: formData.time,
          owner_name: formData.ownerName,
          notes: formData.notes || null
        });

      if (appointmentError) throw appointmentError;

      toast.success('Agendamento realizado com sucesso!');
      navigate('/appointments');
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(error.message || 'Erro ao criar agendamento');
      throw error;
    }
  };

  return {
    formData,
    updateFormData,
    submitAppointment
  };
};
