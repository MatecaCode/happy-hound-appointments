
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
        console.log('Fetching providers with role:', targetRole);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, role, phone')
          .eq('role', targetRole);
          
        if (error) {
          console.error('Error fetching providers:', error);
          throw error;
        }
        
        console.log('Found providers:', data);
        setGroomers(data || []);
      } catch (error) {
        console.error('Error fetching providers:', error);
        toast.error('Erro ao carregar profissionais');
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

  // Fetch available time slots for selected groomer and date
  useEffect(() => {
    if (selectedGroomerId && date) {
      fetchAvailableTimeSlots();
    }
  }, [selectedGroomerId, date]);

  const fetchAvailableTimeSlots = async () => {
    if (!selectedGroomerId || !date) return;
    
    try {
      setIsLoading(true);
      const dateStr = date.toISOString().split('T')[0];
      
      // Get provider availability - use direct query instead of RPC
      const { data: availability, error: availError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr);

      if (availError && availError.code !== 'PGRST116') {
        console.error('Error fetching availability:', availError);
      }

      // Get existing appointments for this provider and date
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('time')
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr)
        .eq('status', 'upcoming');

      if (apptError) {
        console.error('Error fetching appointments:', apptError);
      }

      // Generate all possible time slots
      const allSlots: TimeSlot[] = [];
      for (let hour = 8; hour < 17; hour++) {
        allSlots.push({
          id: `${hour}:00`,
          time: `${hour}:00`,
          available: true
        });
        if (hour < 16) {
          allSlots.push({
            id: `${hour}:30`,
            time: `${hour}:30`,
            available: true
          });
        }
      }

      // Check availability based on provider's schedule
      const availableSlots = allSlots.map(slot => {
        // Check if provider has set this time as available
        const providerAvailability = availability?.find(a => a.time_slot === slot.time);
        const isProviderAvailable = providerAvailability ? providerAvailability.available : true; // Default to available

        // Check if slot is already booked
        const isBooked = appointments?.some(apt => apt.time === slot.time);

        return {
          ...slot,
          available: isProviderAvailable && !isBooked
        };
      });

      setTimeSlots(availableSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Erro ao carregar horários disponíveis');
    } finally {
      setIsLoading(false);
    }
  };

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

    if (!selectedPet || !selectedService || !selectedGroomerId || !selectedTimeSlotId) {
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

      // Get user profile for owner name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

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
          owner_name: profileData.name,
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
