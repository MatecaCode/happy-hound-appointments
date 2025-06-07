
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  service_type: 'grooming' | 'veterinary';
  description?: string;
}

export interface Groomer {
  id: string;
  name: string;
  role: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

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

export const useAppointmentForm = (serviceType: 'grooming' | 'veterinary') => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Form data state
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

  // Individual form states for compatibility
  const [date, setDate] = useState<Date | null>(null);
  const [selectedGroomerId, setSelectedGroomerId] = useState('');
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState('');
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [notes, setNotes] = useState('');
  
  // Data states
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [activeTab, setActiveTab] = useState('calendar');
  const [nextAvailable, setNextAvailable] = useState<{date: Date, time: string} | null>(null);

  // Update formData when individual states change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date,
      groomerId: selectedGroomerId,
      time: selectedTimeSlotId,
      petName: selectedPet?.name || '',
      service: selectedService?.name || '',
      serviceId: selectedService?.id || '',
      ownerName,
      notes
    }));
  }, [date, selectedGroomerId, selectedTimeSlotId, selectedPet, selectedService, ownerName, notes]);

  // Fetch user's pets
  useEffect(() => {
    const fetchUserPets = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', user.id);
          
        if (error) throw error;
        setUserPets(data || []);
      } catch (error) {
        console.error('Error fetching pets:', error);
      }
    };
    
    fetchUserPets();
  }, [user]);

  // Fetch groomers/vets
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const targetRole = serviceType === 'grooming' ? 'groomer' : 'vet';
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, role')
          .eq('role', targetRole);
          
        if (error) throw error;
        setGroomers(data || []);
      } catch (error) {
        console.error('Error fetching providers:', error);
      }
    };
    
    fetchProviders();
  }, [serviceType]);

  const fetchServices = useCallback(async (type: 'grooming' | 'veterinary') => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('service_type', type);
        
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  }, []);

  // Generate time slots for selected date
  useEffect(() => {
    if (date) {
      const slots: TimeSlot[] = [];
      for (let hour = 9; hour < 17; hour++) {
        slots.push({
          id: `${hour}:00`,
          time: `${hour}:00`,
          available: true
        });
        if (hour < 16) {
          slots.push({
            id: `${hour}:30`,
            time: `${hour}:30`,
            available: true
          });
        }
      }
      setTimeSlots(slots);
    }
  }, [date]);

  const updateFormData = (updates: Partial<AppointmentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNextAvailableSelect = () => {
    if (nextAvailable) {
      setDate(nextAvailable.date);
      setSelectedTimeSlotId(nextAvailable.time);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!user) {
      toast.error('Você precisa estar logado para agendar');
      return;
    }

    try {
      setIsLoading(true);
      await submitAppointment(user.id);
    } catch (error) {
      console.error('Error submitting appointment:', error);
    } finally {
      setIsLoading(false);
    }
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
    // Form data
    formData,
    updateFormData,
    submitAppointment,
    
    // Individual states for compatibility
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
    ownerName, 
    setOwnerName,
    notes,
    setNotes,
    
    // Data
    timeSlots,
    userPets,
    services,
    groomers,
    
    // UI states
    isLoading,
    nextAvailable,
    activeTab,
    setActiveTab,
    formStep,
    setFormStep,
    
    // Functions
    handleNextAvailableSelect,
    handleSubmit,
    fetchServices,
  };
};
