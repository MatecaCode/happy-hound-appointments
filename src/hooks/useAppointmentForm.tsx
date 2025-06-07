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

  // Fetch providers (groomers or vets)
  const fetchProviders = useCallback(async (type: 'grooming' | 'veterinary') => {
    try {
      const targetRole = type === 'grooming' ? 'groomer' : 'vet';
      console.log('🔍 DETAILED FETCH - Service type:', type);
      console.log('🔍 DETAILED FETCH - Target role:', targetRole);
      
      // First, let's get ALL profiles without any filtering to see what's in the database
      console.log('📊 Step 1: Fetching ALL profiles to see what exists...');
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      console.log('📊 ALL PROFILES QUERY RESULT:');
      console.log('   - Error:', allError);
      console.log('   - Data count:', allProfiles?.length || 0);
      console.log('   - Raw data:', allProfiles);
      
      if (allProfiles && allProfiles.length > 0) {
        console.log('📋 DETAILED PROFILE BREAKDOWN:');
        allProfiles.forEach((profile, index) => {
          console.log(`   ${index + 1}. ID: ${profile.id.substring(0, 8)}...`);
          console.log(`      Name: "${profile.name}"`);
          console.log(`      Role: "${profile.role}" (type: ${typeof profile.role})`);
          console.log(`      Role === "groomer": ${profile.role === 'groomer'}`);
          console.log(`      Role === "vet": ${profile.role === 'vet'}`);
          console.log(`      Role length: ${profile.role?.length || 'null'}`);
          console.log(`      Role charCodes: ${profile.role ? Array.from(profile.role).map(c => c.charCodeAt(0)).join(',') : 'null'}`);
          console.log('      ---');
        });
        
        // Count by role
        const groomers = allProfiles.filter(p => p.role === 'groomer');
        const vets = allProfiles.filter(p => p.role === 'vet');
        const clients = allProfiles.filter(p => p.role === 'client');
        const others = allProfiles.filter(p => !['groomer', 'vet', 'client'].includes(p.role));
        
        console.log(`📊 ROLE COUNTS:`);
        console.log(`   - Groomers: ${groomers.length}`);
        console.log(`   - Vets: ${vets.length}`);
        console.log(`   - Clients: ${clients.length}`);
        console.log(`   - Others: ${others.length}`);
        
        if (others.length > 0) {
          console.log(`   - Other roles found:`, others.map(p => `"${p.role}"`));
        }
      }
      
      // Now try the targeted query
      console.log(`📊 Step 2: Targeted query for role = "${targetRole}"`);
      const { data: providers, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', targetRole)
        .order('name');

      console.log('🎯 TARGETED QUERY RESULT:');
      console.log('   - Target role:', targetRole);
      console.log('   - Error:', error);
      console.log('   - Found providers:', providers?.length || 0);
      console.log('   - Provider data:', providers);

      if (error) {
        console.error('❌ Error in targeted query:', error);
        throw error;
      }

      if (!providers || providers.length === 0) {
        console.log('⚠️ NO PROVIDERS FOUND');
        console.log(`💡 Expected to find profiles with role = "${targetRole}"`);
        
        // Try alternative queries to debug
        console.log('🔍 Trying alternative queries...');
        
        // Case insensitive search
        const { data: caseInsensitive } = await supabase
          .from('profiles')
          .select('*')
          .ilike('role', targetRole);
          
        console.log(`   - Case insensitive search for "${targetRole}":`, caseInsensitive?.length || 0);
        
        // Search with LIKE
        const { data: likeSearch } = await supabase
          .from('profiles')
          .select('*')
          .like('role', `%${targetRole}%`);
          
        console.log(`   - LIKE search for "%${targetRole}%":`, likeSearch?.length || 0);
        
        setGroomers([]);
        return;
      }

      // Transform the data to match our Provider interface
      const transformedProviders: Provider[] = providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        role: provider.role,
        rating: 4.5, // Default rating
        specialty: type === 'grooming' ? 'Tosa geral' : 'Clínica geral',
        about: `${type === 'grooming' ? 'Tosador' : 'Veterinário'} experiente com anos de experiência.`
      }));

      console.log('✅ FINAL RESULT:');
      console.log('   - Transformed providers:', transformedProviders.length);
      console.log('   - Provider details:', transformedProviders);
      
      setGroomers(transformedProviders);
      
    } catch (error: any) {
      console.error('💥 FETCH PROVIDERS ERROR:', error);
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

  // Fetch providers when service type changes
  useEffect(() => {
    console.log('🔄 Service type changed to:', serviceType);
    fetchProviders(serviceType);
  }, [serviceType, fetchProviders]);

  // Fetch time slots when date or groomer changes
  useEffect(() => {
    fetchTimeSlots();
  }, [fetchTimeSlots]);

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
