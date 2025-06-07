
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
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
      
      console.log('🚀 START: Fetching Available Providers');
      console.log('   📋 Service type:', type);
      console.log('   🎯 Target role:', targetRole);
      console.log('   📅 Date string:', dateStr);
      console.log('   📅 Original date:', selectedDate);
      
      // Step 1: Get ALL profiles with detailed query
      console.log('🔍 STEP 1: Fetching ALL profiles from database...');
      
      const { data: allProfiles, error: allProfilesError, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('name');

      console.log('📊 QUERY RESULT:');
      console.log('   - Error:', allProfilesError);
      console.log('   - Count:', count);
      console.log('   - Data length:', allProfiles?.length || 0);
      console.log('   - Raw data:', allProfiles);

      if (allProfilesError) {
        console.error('❌ Error fetching all profiles:', allProfilesError);
        throw allProfilesError;
      }

      if (!allProfiles || allProfiles.length === 0) {
        console.log('⚠️ NO PROFILES RETURNED FROM DATABASE');
        console.log('🔍 Attempting alternative query...');
        
        // Try alternative query without ordering
        const { data: alternativeProfiles, error: altError } = await supabase
          .from('profiles')
          .select('*');
          
        console.log('📊 ALTERNATIVE QUERY RESULT:');
        console.log('   - Error:', altError);
        console.log('   - Data:', alternativeProfiles);
        
        if (altError || !alternativeProfiles || alternativeProfiles.length === 0) {
          console.log('❌ NO PROFILES FOUND WITH ANY QUERY');
          setGroomers([]);
          return;
        }
        
        // Use alternative results
        allProfiles.length = 0;
        allProfiles.push(...alternativeProfiles);
      }

      console.log('📊 ALL PROFILES IN DATABASE:', allProfiles.length);
      allProfiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ID: ${profile.id}, Name: "${profile.name}", Role: "${profile.role}"`);
      });

      // Step 2: Filter by target role
      console.log('🔍 STEP 2: Filtering profiles by role:', targetRole);
      const providersWithRole = allProfiles.filter(profile => {
        console.log(`   - Checking profile: ${profile.name} (role: "${profile.role}") === "${targetRole}"?`, profile.role === targetRole);
        return profile.role === targetRole;
      });

      console.log('📊 PROVIDERS WITH CORRECT ROLE:', providersWithRole.length);
      if (providersWithRole.length > 0) {
        providersWithRole.forEach((provider, index) => {
          console.log(`   ${index + 1}. ID: ${provider.id}, Name: "${provider.name}", Role: "${provider.role}"`);
        });
      } else {
        console.log('⚠️ NO PROVIDERS FOUND with role:', targetRole);
        const availableRoles = [...new Set(allProfiles.map(p => p.role))];
        console.log('💡 Available roles in database:', availableRoles);
        console.log('🔍 Let\'s check exact role matches:');
        allProfiles.forEach(profile => {
          console.log(`   - "${profile.role}" === "${targetRole}"?`, profile.role === targetRole);
          console.log(`   - Role type:`, typeof profile.role);
          console.log(`   - Role length:`, profile.role?.length);
          console.log(`   - Has whitespace?`, /\s/.test(profile.role || ''));
        });
      }

      if (providersWithRole.length === 0) {
        console.log('❌ ENDING EARLY - No providers with correct role');
        setGroomers([]);
        return;
      }

      // Step 3: Check availability for the date
      console.log('🔍 STEP 3: Checking availability for date:', dateStr);
      const { data: availability, error: availError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('date', dateStr)
        .eq('available', true);

      if (availError) {
        console.error('❌ Error fetching availability:', availError);
        console.log('📝 Will show all providers as potentially available');
      }

      console.log('📅 AVAILABILITY DATA for', dateStr, ':', availability?.length || 0, 'slots found');
      if (availability && availability.length > 0) {
        availability.forEach((slot, index) => {
          console.log(`   ${index + 1}. Provider ID: ${slot.provider_id}, Time: ${slot.time_slot}`);
        });
        
        const availableProviderIds = [...new Set(availability.map(a => a.provider_id))];
        console.log('🎯 UNIQUE PROVIDER IDs WITH AVAILABILITY:', availableProviderIds);
      } else {
        console.log('⚠️ NO AVAILABILITY DATA for this date');
      }

      // Step 4: Determine final list of providers
      let availableProviders: any[];
      
      if (availability && availability.length > 0) {
        const availableProviderIds = [...new Set(availability.map(a => a.provider_id))];
        availableProviders = providersWithRole.filter(provider => 
          availableProviderIds.includes(provider.id)
        );
        console.log('✅ PROVIDERS AFTER AVAILABILITY FILTER:', availableProviders.length);
      } else {
        // Show all providers if no availability constraints
        availableProviders = providersWithRole;
        console.log('📋 NO AVAILABILITY CONSTRAINTS - SHOWING ALL PROVIDERS:', availableProviders.length);
      }

      // Step 5: Transform the data for UI
      console.log('🔍 STEP 5: Transforming provider data for UI...');
      const transformedProviders: Provider[] = availableProviders.map(provider => ({
        id: provider.id,
        name: provider.name,
        role: provider.role,
        rating: 4.5, // Default rating
        specialty: type === 'grooming' ? 'Tosa geral' : 'Clínica geral',
        about: `${type === 'grooming' ? 'Tosador' : 'Veterinário'} experiente com anos de experiência.`
      }));

      console.log('✅ FINAL TRANSFORMED PROVIDERS:', transformedProviders.length);
      if (transformedProviders.length > 0) {
        transformedProviders.forEach((provider, index) => {
          console.log(`   ${index + 1}. ${provider.name} (${provider.id})`);
        });
      } else {
        console.log('❌ NO PROVIDERS TO SHOW');
      }

      console.log('🎉 SETTING GROOMERS STATE...');
      setGroomers(transformedProviders);
      console.log('🏁 FINISHED fetchAvailableProviders');
      
    } catch (error: any) {
      console.error('💥 CRITICAL ERROR in fetchAvailableProviders:', error);
      console.error('💥 Error details:', JSON.stringify(error, null, 2));
      toast.error('Erro ao carregar profissionais disponíveis');
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

  // Fetch user's pets
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

  // Submit appointment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para agendar');
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

      // Create appointment
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
          owner_name: user.user_metadata?.name || user.email || '',
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

  // Load initial data
  useEffect(() => {
    fetchUserPets();
  }, [fetchUserPets]);

  // Fetch available providers when date changes (for step 3)
  useEffect(() => {
    if (formStep === 3 && date) {
      console.log('🔄 useEffect triggered: Fetching providers for date:', date, 'Step:', formStep);
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
