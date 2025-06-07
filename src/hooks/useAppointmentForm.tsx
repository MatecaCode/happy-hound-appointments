
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

export interface Provider {
  id: string;
  name: string;
  role: string;
  profile_image?: string;
  rating?: number;
  specialty?: string;
  about?: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface NextAvailable {
  date: Date;
  time: string;
  timeSlot: string;
  groomer: string;
}

export const useAppointmentForm = (serviceType: 'grooming' | 'veterinary') => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Form states
  const [date, setDate] = useState<Date>(new Date());
  const [selectedGroomerId, setSelectedGroomerId] = useState('');
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [notes, setNotes] = useState('');
  
  // Data states
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [groomers, setGroomers] = useState<Provider[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [activeTab, setActiveTab] = useState('calendar');
  const [nextAvailable, setNextAvailable] = useState<NextAvailable | null>(null);

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

  // Fetch providers (groomers/vets)
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const targetRole = serviceType === 'grooming' ? 'groomer' : 'vet';
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, role, phone')
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
      
      // Map the database response to our Service interface
      const mappedServices: Service[] = (data || []).map(service => ({
        id: service.id,
        name: service.name,
        price: service.price,
        duration: service.duration,
        service_type: service.service_type as 'grooming' | 'veterinary',
        description: service.description || undefined
      }));
      
      setServices(mappedServices);
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

  const handleNextAvailableSelect = () => {
    if (nextAvailable) {
      setDate(nextAvailable.date);
      setSelectedTimeSlotId(nextAvailable.timeSlot);
      setSelectedGroomerId(nextAvailable.groomer);
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

    if (!selectedPet || !selectedService || !selectedGroomerId || !selectedTimeSlotId || !ownerName.trim()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsLoading(true);
      
      // Get pet and service details
      const selectedPetData = userPets.find(p => p.id === selectedPet);
      const selectedServiceData = services.find(s => s.id === selectedService);
      
      if (!selectedPetData || !selectedServiceData) {
        throw new Error('Pet ou serviço não encontrado');
      }

      // Create the appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          pet_id: selectedPetData.id,
          pet_name: selectedPetData.name,
          service_id: selectedServiceData.id,
          service: selectedServiceData.name,
          provider_id: selectedGroomerId,
          date: date.toISOString().split('T')[0],
          time: selectedTimeSlotId,
          owner_name: ownerName,
          notes: notes || null,
          status: 'upcoming'
        });

      if (appointmentError) throw appointmentError;

      toast.success('Agendamento realizado com sucesso!');
      navigate('/appointments');
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(error.message || 'Erro ao criar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Form states
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
