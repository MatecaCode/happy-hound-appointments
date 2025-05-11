
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { format, isWeekend } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

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
  timeSlot: {
    id: string;
    time: string;
  };
  groomer: {
    id: string;
    name: string;
  };
}

export const useAppointmentForm = (serviceType: 'grooming' | 'veterinary' = 'grooming') => {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedGroomerId, setSelectedGroomerId] = useState<string>('');
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [ownerName, setOwnerName] = useState('');
  const [notes, setNotes] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextAvailable, setNextAvailable] = useState<NextAvailable | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [formStep, setFormStep] = useState(1);
  
  // Data states
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [groomers, setGroomers] = useState<Provider[]>([]);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Fetch user pets
  useEffect(() => {
    const fetchUserPets = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('pets')
          .select('id, name, breed, age')
          .eq('user_id', user.id);
        
        if (error) throw error;
        setUserPets(data || []);
      } catch (error: any) {
        console.error('Error fetching pets:', error);
      }
    };
    
    fetchUserPets();
  }, [user]);
  
  // Fetch services based on service type
  const fetchServices = useCallback(async (type: string = serviceType) => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('service_type', type);
      
      if (error) throw error;
      setServices(data || []);
      
      // Reset selected service if the current one isn't in the new list
      if (data && selectedService && !data.some(service => service.id === selectedService)) {
        setSelectedService('');
      }
    } catch (error: any) {
      console.error('Error fetching services:', error);
    }
  }, [selectedService, serviceType]);
  
  // Fetch appropriate providers based on serviceType
  useEffect(() => {
    const fetchProviders = async () => {
      setIsLoading(true);
      try {
        const role = serviceType === 'grooming' ? 'groomer' : 'vet';
        
        // First get profile IDs with the correct role
        const { data: providerData, error } = await supabase
          .from('profiles')
          .select('id, name, role')
          .eq('role', role);
        
        if (error) throw error;
        
        if (providerData && providerData.length > 0) {
          // Get additional metadata for each provider
          const enhancedProviders = await Promise.all(providerData.map(async (provider) => {
            // Get user data to get additional metadata like specialty, about, profile_image
            const { data: userData } = await supabase.auth.getUser(provider.id);
            
            const metadata = userData?.user?.user_metadata || {};
            
            // Default rating for demo purposes (would be calculated from real reviews in production)
            const rating = 4.5 + Math.random() * 0.5;
            
            return {
              ...provider,
              profile_image: metadata.profile_image || `/placeholder.svg`,
              about: metadata.about || '',
              specialty: metadata.specialty || '',
              rating
            };
          }));
          
          setGroomers(enhancedProviders);
          
          // Auto-select first groomer if there's only one
          if (enhancedProviders.length === 1 && !selectedGroomerId) {
            setSelectedGroomerId(enhancedProviders[0].id);
          }
        } else {
          setGroomers([]);
          toast.error(`Não foram encontrados ${role === 'groomer' ? 'tosadores' : 'veterinários'} disponíveis`);
        }
      } catch (error: any) {
        console.error('Error fetching providers:', error);
        setGroomers([]);
        toast.error(`Erro ao buscar profissionais: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProviders();
  }, [serviceType, selectedGroomerId]);
  
  // Fetch time slots
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!selectedGroomerId || !date) return;
      
      setIsLoading(true);
      setTimeSlots([]);
      
      try {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Don't fetch time slots for Sundays
        if (date.getDay() === 0) { // 0 is Sunday
          setTimeSlots([]);
          setIsLoading(false);
          return;
        }
        
        // Get time slot interval based on service type
        const interval = serviceType === 'grooming' ? 30 : 45; // minutes
        const startHour = 9; // 9 AM
        const endHour = serviceType === 'grooming' ? 17 : 18; // 5 PM or 6 PM
        
        const slots: TimeSlot[] = [];
        
        // Check existing appointments for this provider on this date
        const { data: existingAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('time')
          .eq('date', dateStr)
          .eq('provider_id', selectedGroomerId);
        
        if (appointmentsError) throw appointmentsError;
        
        console.log(`Found ${existingAppointments?.length || 0} appointments for ${dateStr} with provider ${selectedGroomerId}`);
        
        // Generate all possible time slots
        for (let hour = startHour; hour < endHour; hour++) {
          for (let minute = 0; minute < 60; minute += interval) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Check if this time slot is already booked
            const isBooked = existingAppointments?.some(apt => apt.time === timeStr);
            
            slots.push({
              id: `${dateStr}-${timeStr}`,
              time: timeStr,
              available: !isBooked
            });
          }
        }
        
        setTimeSlots(slots);
        
        // Find next available date starting from today
        if (slots.length === 0 || !slots.some(slot => slot.available)) {
          // If no slots are available for the selected date, try to find one in the next 14 days
          const nextDate = findNextAvailableDate(date, selectedGroomerId);
          nextDate.then((nextAvailableDateResult) => {
            if (nextAvailableDateResult) {
              const provider = groomers.find(g => g.id === selectedGroomerId);
              setNextAvailable({
                date: nextAvailableDateResult.date,
                timeSlot: {
                  id: nextAvailableDateResult.slotId,
                  time: nextAvailableDateResult.time
                },
                groomer: {
                  id: selectedGroomerId,
                  name: provider?.name || 'Profissional'
                }
              });
            } else {
              setNextAvailable(null);
            }
          });
        } else {
          // Find next available time slot for quick select
          const nextAvailableSlot = slots.find(slot => slot.available);
          if (nextAvailableSlot) {
            const provider = groomers.find(g => g.id === selectedGroomerId);
            setNextAvailable({
              date,
              timeSlot: {
                id: nextAvailableSlot.id,
                time: nextAvailableSlot.time
              },
              groomer: {
                id: selectedGroomerId,
                name: provider?.name || 'Profissional'
              }
            });
          } else {
            setNextAvailable(null);
          }
        }
      } catch (error: any) {
        console.error('Error fetching time slots:', error);
        toast.error('Erro ao carregar horários disponíveis');
        setTimeSlots([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Function to find the next available date with an available time slot
    const findNextAvailableDate = async (startDate: Date, groomerId: string) => {
      // Try the next 14 days
      for (let i = 1; i <= 14; i++) {
        const nextDate = new Date(startDate);
        nextDate.setDate(nextDate.getDate() + i);
        
        // Skip Sundays
        if (nextDate.getDay() === 0) {
          continue;
        }
        
        const dateStr = format(nextDate, 'yyyy-MM-dd');
        
        // Get time slot interval based on service type
        const interval = serviceType === 'grooming' ? 30 : 45;
        const startHour = 9;
        const endHour = serviceType === 'grooming' ? 17 : 18;
        
        // Check existing appointments for this date
        const { data: existingAppointments, error } = await supabase
          .from('appointments')
          .select('time')
          .eq('date', dateStr)
          .eq('provider_id', groomerId);
        
        if (error) continue;
        
        // Generate possible time slots for this date
        for (let hour = startHour; hour < endHour; hour++) {
          for (let minute = 0; minute < 60; minute += interval) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Check if this slot is available
            const isBooked = existingAppointments?.some(apt => apt.time === timeStr);
            
            if (!isBooked) {
              return {
                date: nextDate,
                time: timeStr,
                slotId: `${dateStr}-${timeStr}`
              };
            }
          }
        }
      }
      
      // No available slots found in the next 14 days
      return null;
    };
    
    fetchTimeSlots();
  }, [date, selectedGroomerId, groomers, serviceType]);
  
  // Set initial owner name from user data
  useEffect(() => {
    if (user && user.user_metadata?.name) {
      setOwnerName(user.user_metadata.name);
    }
  }, [user]);
  
  const handleNextAvailableSelect = () => {
    if (!nextAvailable) return;
    
    setSelectedTimeSlotId(nextAvailable.timeSlot.id);
    setDate(nextAvailable.date);
    setActiveTab('calendar'); // Switch to calendar tab to show the selected date and time
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPet || !selectedService || !selectedGroomerId || !selectedTimeSlotId || !ownerName) {
      toast.error('Por favor preencha todos os campos obrigatórios');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get pet and service details
      const { data: petData } = await supabase
        .from('pets')
        .select('name')
        .eq('id', selectedPet)
        .single();
      
      const { data: serviceData } = await supabase
        .from('services')
        .select('name')
        .eq('id', selectedService)
        .single();
      
      if (!petData || !serviceData) {
        throw new Error('Dados do pet ou serviço não encontrados');
      }
      
      // Parse the time from the selected time slot ID
      const timeSlotParts = selectedTimeSlotId.split('-');
      const time = timeSlotParts[timeSlotParts.length - 1];
      
      // Create appointment
      const appointmentData = {
        user_id: user?.id || '',
        pet_id: selectedPet,
        pet_name: petData.name,
        service_id: selectedService,
        service: serviceData.name,
        date: format(date, 'yyyy-MM-dd'),
        time,
        owner_name: ownerName,
        provider_id: selectedGroomerId,
        notes,
        status: 'upcoming'
      };
      
      const { error } = await supabase
        .from('appointments')
        .insert([appointmentData]);
      
      if (error) throw error;
      
      toast.success('Agendamento realizado com sucesso!');
      navigate('/confirmation', { 
        state: { 
          appointment: {
            ...appointmentData,
            serviceType
          }
        }
      });
    } catch (error: any) {
      console.error('Error creating appointment:', error.message);
      toast.error('Erro ao criar agendamento. Tente novamente.');
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
    fetchServices
  };
};
