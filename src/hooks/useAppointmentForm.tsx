
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Pet {
  id: string;
  name: string;
  breed: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface Groomer {
  id: string;
  name: string;
  bio: string;
  rating: number;
  imageUrl: string;
  specialties?: string[];
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface NextAvailable {
  date: Date;
  timeSlot: {
    id: string;
    time: string;
  };
  groomer: {
    id: string;
    name: string;
  };
}

export const useAppointmentForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [date, setDate] = useState<Date>(new Date());
  const [selectedGroomerId, setSelectedGroomerId] = useState<string | null>(null);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [ownerPhone, setOwnerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [nextAvailable, setNextAvailable] = useState<NextAvailable | null>(null);
  const [activeTab, setActiveTab] = useState<string>('calendar');
  const [formStep, setFormStep] = useState<number>(1);
  
  // Sample data that will be replaced with API calls
  const [userPets, setUserPets] = useState<Pet[]>([
    { id: '1', name: 'Max', breed: 'Golden Retriever' },
    { id: '2', name: 'Bella', breed: 'Poodle' },
    { id: '3', name: 'Charlie', breed: 'Beagle' },
  ]);
  
  const [services, setServices] = useState<Service[]>([
    { id: '1', name: 'Tosa Completa', price: 80 },
    { id: '2', name: 'Banho & Escovação', price: 50 },
    { id: '3', name: 'Corte de Unhas', price: 25 },
    { id: '4', name: 'Pacote Spa Luxo', price: 120 },
  ]);
  
  const [groomers, setGroomers] = useState<Groomer[]>([
    {
      id: '1',
      name: 'João Silva',
      bio: 'Especialista em tosa de raças pequenas, com 5 anos de experiência.',
      rating: 4.8,
      imageUrl: '/placeholder.svg',
      specialties: ['Raças pequenas', 'Yorkshire', 'Shih Tzu']
    },
    {
      id: '2',
      name: 'Maria Oliveira',
      bio: 'Especializada em tosa higiênica e banhos para cães de qualquer porte.',
      rating: 4.5,
      imageUrl: '/placeholder.svg',
      specialties: ['Todas as raças', 'Tosa higiênica']
    },
    {
      id: '3',
      name: 'Pedro Santos',
      bio: 'Tosador profissional com experiência em exposições caninas.',
      rating: 4.9,
      imageUrl: '/placeholder.svg',
      specialties: ['Raças grandes', 'Tosa para exibição']
    },
  ]);
  
  // Fetch pets if user is logged in
  useEffect(() => {
    if (user) {
      setOwnerName(user.user_metadata?.name || '');
      
      // Fetch user pets
      const fetchUserPets = async () => {
        try {
          const { data, error } = await supabase
            .from('pets')
            .select('*')
            .eq('user_id', user.id);
            
          if (error) throw error;
          if (data && data.length > 0) {
            setUserPets(data);
            setSelectedPet(data[0].id);
          }
        } catch (error) {
          console.error('Error fetching pets:', error);
        }
      };
      
      fetchUserPets();
    }
    
    // Fetch services
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('service_type', 'grooming');
          
        if (error) throw error;
        if (data && data.length > 0) {
          setServices(data);
          setSelectedService(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };
    
    fetchServices();
    
    // Fetch groomers (profiles with role 'groomer')
    const fetchGroomers = async () => {
      try {
        // First check if the necessary columns exist in the profiles table
        const { data: profileColumns, error: columnsError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
          
        if (columnsError) {
          console.error('Error checking profiles table:', columnsError);
          return;
        }
        
        // Now fetch groomers using the existing columns
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, role, phone, email')
          .eq('role', 'groomer');
          
        if (error) throw error;
        if (data && data.length > 0) {
          // Transform the data to match the Groomer interface
          const formattedGroomers = data.map(g => ({
            id: g.id,
            name: g.name || 'Groomer',
            bio: 'Professional groomer with experience in pet care',  // Default bio
            rating: 4.5,  // Default rating
            imageUrl: '/placeholder.svg',  // Default image
            specialties: ['All breeds', 'Pet grooming']  // Default specialties
          }));
          setGroomers(formattedGroomers);
        }
      } catch (error) {
        console.error('Error fetching groomers:', error);
      }
    };
    
    fetchGroomers();
  }, [user]);
  
  // Generate time slots based on date and selected groomer
  useEffect(() => {
    if (!date || !selectedGroomerId) return;
    
    const fetchAvailableSlots = async () => {
      setIsLoading(true);
      try {
        // Start time 9:00, end time 17:00, 30 min intervals
        const startHour = 9;
        const endHour = 17;
        const interval = 30; // minutes
        
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        // Fetch existing appointments for this groomer on this date
        const { data: existingAppointments, error } = await supabase
          .from('appointments')
          .select('time')
          .eq('date', formattedDate)
          .eq('provider_id', selectedGroomerId);
          
        if (error) throw error;
        
        // Generate all possible time slots
        const allTimeSlots: TimeSlot[] = [];
        
        for (let hour = startHour; hour < endHour; hour++) {
          for (let minute = 0; minute < 60; minute += interval) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const isBooked = existingAppointments?.some(app => app.time === timeString) || false;
            
            allTimeSlots.push({
              id: `${formattedDate}-${timeString}`,
              time: timeString,
              available: !isBooked
            });
          }
        }
        
        setTimeSlots(allTimeSlots);
        
        // Find next available slot
        const nextAvailableSlot = allTimeSlots.find(slot => slot.available);
        if (nextAvailableSlot && selectedGroomerId) {
          const groomer = groomers.find(g => g.id === selectedGroomerId);
          if (groomer) {
            setNextAvailable({
              date: date,
              timeSlot: {
                id: nextAvailableSlot.id,
                time: nextAvailableSlot.time
              },
              groomer: {
                id: groomer.id,
                name: groomer.name
              }
            });
          }
        } else {
          setNextAvailable(null);
        }
      } catch (error: any) {
        console.error('Error fetching available slots:', error);
        toast.error('Erro ao buscar horários disponíveis');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAvailableSlots();
  }, [date, selectedGroomerId, groomers]);
  
  const handleNextAvailableSelect = () => {
    if (!nextAvailable) return;
    
    setDate(nextAvailable.date);
    setSelectedTimeSlotId(nextAvailable.timeSlot.id);
    setSelectedGroomerId(nextAvailable.groomer.id);
    setActiveTab('calendar'); // Switch to calendar tab
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedPet) {
      toast.error('Por favor, selecione um pet');
      return;
    }
    
    if (!selectedService) {
      toast.error('Por favor, selecione um serviço');
      return;
    }
    
    if (!date || !selectedTimeSlotId || !selectedGroomerId) {
      toast.error('Por favor, selecione data, horário e profissional');
      return;
    }
    
    if (!ownerName) {
      toast.error('Por favor, informe o nome do proprietário');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const formattedDate = format(date, 'yyyy-MM-dd');
      const selectedTime = timeSlots.find(slot => slot.id === selectedTimeSlotId)?.time || '';
      const petDetails = userPets.find(pet => pet.id === selectedPet);
      const serviceDetails = services.find(service => service.id === selectedService);
      
      // Create appointment
      const { data, error } = await supabase.from('appointments').insert({
        user_id: user?.id || '',
        pet_id: selectedPet,
        pet_name: petDetails?.name || '',
        service_id: selectedService,
        service: serviceDetails?.name || '',
        date: formattedDate,
        time: selectedTime,
        provider_id: selectedGroomerId,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        notes: notes,
        status: 'upcoming'
      }).select();
      
      if (error) throw error;
      
      toast.success('Agendamento realizado com sucesso!');
      navigate('/confirmation', { 
        state: { 
          appointmentId: data[0].id,
          petName: petDetails?.name,
          serviceName: serviceDetails?.name,
          date: formattedDate,
          time: selectedTime
        } 
      });
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(`Erro ao criar agendamento: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
    ownerName, 
    setOwnerName,
    ownerPhone,
    setOwnerPhone,
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
    handleSubmit
  };
};

export default useAppointmentForm;
