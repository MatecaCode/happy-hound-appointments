import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import GroomerSelector, { Groomer } from './GroomerSelector';
import TimeSlotSelector, { TimeSlot } from './TimeSlotSelector';
import NextAvailableAppointment, { NextAvailable } from './NextAvailableAppointment';

// Example data - will be replaced with data from Supabase
const samplePets = [
  { id: '1', name: 'Max', breed: 'Golden Retriever' },
  { id: '2', name: 'Bella', breed: 'Poodle' },
  { id: '3', name: 'Charlie', breed: 'Beagle' },
];

const sampleServices = [
  { id: '1', name: 'Tosa Completa', price: 80 },
  { id: '2', name: 'Banho & Escovação', price: 50 },
  { id: '3', name: 'Corte de Unhas', price: 25 },
  { id: '4', name: 'Pacote Spa Luxo', price: 120 },
];

const sampleGroomers: Groomer[] = [
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
];

const AppointmentForm = () => {
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
  
  // Fetch pets if user is logged in
  const [userPets, setUserPets] = useState(samplePets);
  const [services, setServices] = useState(sampleServices);
  const [groomers, setGroomers] = useState(sampleGroomers);
  
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
      } catch (error) {
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
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {formStep === 1 && (
        <>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">1. Informações Básicas</h2>
            
            <div>
              <Label htmlFor="pet">Seu Pet</Label>
              <Select value={selectedPet} onValueChange={setSelectedPet}>
                <SelectTrigger id="pet" className="w-full">
                  <SelectValue placeholder="Selecione seu pet" />
                </SelectTrigger>
                <SelectContent>
                  {userPets.map(pet => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name} ({pet.breed})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="service">Serviço</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger id="service" className="w-full">
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - R$ {service.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="ownerName">Seu Nome</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            
            <div>
              <Label htmlFor="ownerPhone">Telefone</Label>
              <Input
                id="ownerPhone"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
              />
            </div>
          </div>
          
          <Button 
            type="button" 
            onClick={() => setFormStep(2)} 
            disabled={!selectedPet || !selectedService || !ownerName}
          >
            Próximo
          </Button>
        </>
      )}
      
      {formStep === 2 && (
        <>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">2. Escolha de Tosador</h2>
              <Button variant="ghost" size="sm" onClick={() => setFormStep(1)}>Voltar</Button>
            </div>
            
            <GroomerSelector
              groomers={groomers}
              selectedGroomerId={selectedGroomerId}
              onSelect={setSelectedGroomerId}
            />
          </div>
          
          <Button 
            type="button" 
            onClick={() => setFormStep(3)} 
            disabled={!selectedGroomerId}
          >
            Próximo
          </Button>
        </>
      )}
      
      {formStep === 3 && (
        <>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">3. Escolha da Data e Hora</h2>
              <Button variant="ghost" size="sm" onClick={() => setFormStep(2)}>Voltar</Button>
            </div>
            
            <Tabs defaultValue="calendar" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="calendar">Calendário</TabsTrigger>
                <TabsTrigger value="next">Próximo Disponível</TabsTrigger>
              </TabsList>
              
              <TabsContent value="calendar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-4">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => newDate && setDate(newDate)}
                        className="mx-auto pointer-events-auto"
                        locale={ptBR}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                      />
                    </CardContent>
                  </Card>
                  
                  <div>
                    <TimeSlotSelector
                      date={date}
                      timeSlots={timeSlots}
                      selectedTimeSlotId={selectedTimeSlotId}
                      onSelectTimeSlot={setSelectedTimeSlotId}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="next">
                <div className="py-6">
                  <NextAvailableAppointment
                    nextAvailable={nextAvailable}
                    onSelect={handleNextAvailableSelect}
                    loading={isLoading}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alguma observação importante sobre o pet?"
                rows={3}
              />
            </div>
          </div>
          
          <Button type="submit" disabled={isLoading || !selectedTimeSlotId}>
            {isLoading ? 'Agendando...' : 'Concluir Agendamento'}
          </Button>
        </>
      )}
    </form>
  );
};

export default AppointmentForm;
