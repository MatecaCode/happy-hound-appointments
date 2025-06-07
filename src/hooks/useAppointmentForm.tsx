import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export interface Provider {
  id: string;
  name: string;
  role: string;
  profile_image?: string;
  rating?: number;
  specialty?: string;
  about?: string;
}

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

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface NextAvailable {
  date: string;
  time: string;
  provider_name: string;
}

export const useAppointmentForm = (serviceType: 'grooming' | 'veterinary') => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [selectedGroomerId, setSelectedGroomerId] = useState<string>('');
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string>('');
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Data state
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextAvailable, setNextAvailable] = useState<NextAvailable | null>(null);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [groomers, setGroomers] = useState<Provider[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'calendar' | 'next-available'>('calendar');
  const [formStep, setFormStep] = useState(1);

  // Fetch providers available on a specific date
  const fetchAvailableProviders = useCallback(async (type: 'grooming' | 'veterinary', selectedDate: Date) => {
    try {
      const targetRole = type === 'grooming' ? 'groomer' : 'vet';
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('🔍 DEBUG: Starting fetchAvailableProviders');
      console.log('🔍 DEBUG: Target role:', targetRole);
      console.log('🔍 DEBUG: Date string:', dateStr);
      console.log('🔍 DEBUG: Service type:', type);
      
      // Step 1: Get ALL profiles to see what we have
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      console.log('🔍 DEBUG: All profiles from DB:', allProfiles);
      console.log('🔍 DEBUG: Profiles error:', profilesError);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!allProfiles || allProfiles.length === 0) {
        console.log('❌ No profiles found in database');
        setGroomers([]);
        return;
      }

      // Step 2: Filter by role
      const matchingProviders = allProfiles.filter(profile => {
        console.log(`🔍 DEBUG: Checking profile ${profile.name} with role ${profile.role} against target ${targetRole}`);
        return profile.role === targetRole;
      });
      
      console.log('🔍 DEBUG: Providers matching role:', matchingProviders);

      if (matchingProviders.length === 0) {
        console.log(`❌ No providers match the role: ${targetRole}`);
        console.log('🔍 DEBUG: Available roles in DB:', allProfiles.map(p => p.role));
        setGroomers([]);
        return;
      }

      // Step 3: Check availability for each provider
      const providersWithAvailability = [];
      
      for (const provider of matchingProviders) {
        console.log(`🔍 DEBUG: Checking availability for provider ${provider.name} (${provider.id}) on ${dateStr}`);
        
        const { data: availability, error: availError } = await supabase
          .from('provider_availability')
          .select('*')
          .eq('provider_id', provider.id)
          .eq('date', dateStr)
          .eq('available', true);
          
        console.log(`🔍 DEBUG: Availability for ${provider.name}:`, availability);
        console.log(`🔍 DEBUG: Availability error:`, availError);
        
        if (availability && availability.length > 0) {
          console.log(`✅ Provider ${provider.name} has ${availability.length} available slots`);
          providersWithAvailability.push(provider);
        } else {
          console.log(`❌ Provider ${provider.name} has no available slots on ${dateStr}`);
        }
      }

      console.log('🔍 DEBUG: Providers with availability:', providersWithAvailability);

      // Transform for UI (with default values)
      const transformedProviders: Provider[] = providersWithAvailability.map(provider => ({
        id: provider.id,
        name: provider.name,
        role: provider.role,
        rating: 4.5,
        specialty: type === 'grooming' ? 'Tosa geral' : 'Clínica geral',
        about: `${type === 'grooming' ? 'Tosador' : 'Veterinário'} experiente.`
      }));

      console.log('✅ Final transformed providers:', transformedProviders);
      setGroomers(transformedProviders);
      
    } catch (error: any) {
      console.error('💥 Error in fetchAvailableProviders:', error);
      toast.error('Erro ao carregar profissionais');
      setGroomers([]);
    }
  }, []);

  // Fetch services based on service type
  const fetchServices = useCallback(async (type: 'grooming' | 'veterinary') => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('service_type', type)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    }
  }, []);

  // Fetch user's pets - re-enable real functionality
  const fetchUserPets = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setUserPets(data || []);
    } catch (error: any) {
      console.error('Error fetching pets:', error);
      toast.error('Erro ao carregar pets');
    }
  }, [user]);

  // Fetch available time slots for selected date and groomer
  const fetchTimeSlots = useCallback(async () => {
    if (!date || !selectedGroomerId) {
      setTimeSlots([]);
      return;
    }

    setIsLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // Get provider availability
      const { data: availability, error: availError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr)
        .eq('available', true);

      if (availError) throw availError;

      // Get existing appointments
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('time')
        .eq('provider_id', selectedGroomerId)
        .eq('date', dateStr)
        .eq('status', 'upcoming');

      if (apptError) throw apptError;

      // Create time slots from availability, excluding booked times
      const bookedTimes = appointments?.map(apt => apt.time) || [];
      const slots: TimeSlot[] = (availability || [])
        .filter(slot => !bookedTimes.includes(slot.time_slot))
        .map(slot => ({
          id: slot.time_slot,
          time: slot.time_slot,
          available: true
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      setTimeSlots(slots);
    } catch (error: any) {
      console.error('Error fetching time slots:', error);
      toast.error('Erro ao carregar horários disponíveis');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [date, selectedGroomerId]);

  // Handle next available appointment selection
  const handleNextAvailableSelect = () => {
    if (nextAvailable) {
      setDate(new Date(nextAvailable.date));
      setSelectedTimeSlotId(nextAvailable.time);
      setActiveTab('calendar');
    }
  };

  // Submit appointment - use real user
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para fazer um agendamento');
      navigate('/login');
      return;
    }
    
    if (!selectedPet || !selectedService || !selectedGroomerId || !date || !selectedTimeSlotId) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsLoading(true);
    try {
      // Get pet and service details
      const { data: pet } = await supabase
        .from('pets')
        .select('name')
        .eq('id', selectedPet)
        .single();

      const { data: service } = await supabase
        .from('services')
        .select('name')
        .eq('id', selectedService)
        .single();

      const { data: provider } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', selectedGroomerId)
        .single();

      // Get user profile for owner name
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      // Create appointment with real user
      const { error } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          pet_id: selectedPet,
          service_id: selectedService,
          provider_id: selectedGroomerId,
          date: date.toISOString().split('T')[0],
          time: selectedTimeSlotId,
          service: service?.name || '',
          pet_name: pet?.name || '',
          owner_name: userProfile?.name || user.email || 'Usuário',
          notes: notes || null
        });

      if (error) throw error;

      toast.success('Agendamento realizado com sucesso!');
      navigate('/confirmation');
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error('Erro ao criar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data - re-enable real data fetching
  useEffect(() => {
    if (user) {
      fetchUserPets();
    }
  }, [user, fetchUserPets]);

  // Fetch available providers when date changes (for step 3)
  useEffect(() => {
    if (formStep === 3 && date) {
      console.log('🔍 DEBUG: useEffect triggered for step 3, date:', date);
      fetchAvailableProviders(serviceType, date);
    }
  }, [formStep, date, serviceType, fetchAvailableProviders]);

  // Fetch time slots when date or groomer changes
  useEffect(() => {
    if (formStep === 4) {
      fetchTimeSlots();
    }
  }, [formStep, fetchTimeSlots]);

  return {
    // State
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
    
    // Actions
    handleNextAvailableSelect,
    handleSubmit,
    fetchServices,
  };
};
