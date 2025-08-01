
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
  user_id: string;
}

interface Pet {
  id: string;
  name: string;
  breed?: string;
}

interface Service {
  id: string;
  name: string;
  default_duration: number;
  base_price: number;
}

interface Staff {
  id: string;
  name: string;
  can_groom: boolean;
  can_vet: boolean;
}

interface TimeSlot {
  time_slot: string;
}

const AdminBookingPage = () => {
  const { user, isAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPet, setSelectedPet] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    if (!isAdmin) return;
    
    const loadData = async () => {
      try {
        // Load clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, user_id')
          .order('name');
        setClients(clientsData || []);

        // Load services
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name, default_duration, base_price')
          .eq('active', true)
          .order('name');
        setServices(servicesData || []);

        // Load available staff (excludes admins)
        const { data: staffData } = await supabase
          .from('available_staff')
          .select('id, name, can_groom, can_vet')
          .order('name');
        setStaff(staffData || []);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erro ao carregar dados');
      }
    };

    loadData();
  }, [isAdmin]);

  // Load pets when client changes
  useEffect(() => {
    if (!selectedClient) {
      setPets([]);
      return;
    }

    const loadPets = async () => {
      try {
        const { data: petsData } = await supabase
          .from('pets')
          .select('id, name, breed')
          .eq('client_id', selectedClient)
          .eq('active', true)
          .order('name');
        setPets(petsData || []);
      } catch (error) {
        console.error('Error loading pets:', error);
        toast.error('Erro ao carregar pets');
      }
    };

    loadPets();
  }, [selectedClient]);

  // Load available time slots when date and service change
  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setAvailableSlots([]);
      return;
    }

    const loadTimeSlots = async () => {
      try {
        setIsLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        
        // Manual slot generation for Phase 1 (since RPC may not exist)
        const slots: TimeSlot[] = [];
        
        // Generate 30-minute slots from 9:00 to 16:00 (weekdays) / 12:00 (Saturdays)
        for (let hour = 9; hour < 17; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            slots.push({ time_slot: timeStr });
          }
        }
        
        setAvailableSlots(slots);
      } catch (error) {
        console.error('Error loading time slots:', error);
        toast.error('Erro ao carregar horários');
      } finally {
        setIsLoading(false);
      }
    };

    loadTimeSlots();
  }, [selectedDate, selectedService, selectedStaff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient || !selectedPet || !selectedService || !selectedDate || !selectedTimeSlot) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsLoading(true);
    
    try {
      // Prepare staff profile IDs array
      const staffProfileIds = selectedStaff ? [selectedStaff] : [];
      
      console.log('Creating admin booking with RPC:', {
        client_id: selectedClient,
        pet_id: selectedPet,
        service_id: selectedService,
        staff_profile_ids: staffProfileIds,
        booking_date: selectedDate.toISOString().split('T')[0],
        time_slot: selectedTimeSlot,
        notes: notes || null,
        is_override: false
      });

      // Call the new admin booking RPC function
      const { data, error } = await supabase.rpc('create_booking_admin', {
        client_id: selectedClient,
        pet_id: selectedPet,
        service_id: selectedService,
        staff_profile_ids: staffProfileIds,
        booking_date: selectedDate.toISOString().split('T')[0],
        time_slot: selectedTimeSlot,
        notes: notes || null,
        is_override: false
      });

      if (error) {
        console.error('RPC Error:', error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('No response from booking function');
      }

      // Parse the JSON response
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        console.error('Booking failed:', result);
        throw new Error(result.message || 'Unknown booking error');
      }

      console.log('Booking successful:', result);
      toast.success(result.message || 'Agendamento criado com sucesso!');
      
      // Reset form
      setSelectedClient('');
      setSelectedPet('');
      setSelectedService('');
      setSelectedStaff('');
      setSelectedDate(undefined);
      setSelectedTimeSlot('');
      setNotes('');
      
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error('Erro ao criar agendamento: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-6 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Acesso Negado</h2>
              <p>Você não tem permissão para acessar esta página.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Agendamento Administrativo</CardTitle>
            <CardDescription>
              Crie agendamentos em nome dos clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pet">Pet *</Label>
                  <Select value={selectedPet} onValueChange={setSelectedPet} disabled={!selectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} {pet.breed && `(${pet.breed})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">Serviço *</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - R$ {service.base_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staff">Profissional (opcional)</Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((staffMember) => (
                        <SelectItem key={staffMember.id} value={staffMember.id}>
                          {staffMember.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Data do Agendamento *</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || date.getDay() === 0; // Disable past dates and Sundays
                  }}
                  className="rounded-md border w-fit"
                />
              </div>

              {selectedDate && (
                <div className="space-y-2">
                  <Label>Horário Disponível *</Label>
                  {isLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time_slot}
                          type="button"
                          variant={selectedTimeSlot === slot.time_slot ? "default" : "outline"}
                          onClick={() => setSelectedTimeSlot(slot.time_slot)}
                          className="h-10"
                        >
                          {slot.time_slot.substring(0, 5)}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum horário disponível para esta data.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações sobre o agendamento..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || !selectedClient || !selectedPet || !selectedService || !selectedDate || !selectedTimeSlot}
                className="w-full"
              >
                {isLoading ? 'Criando...' : 'Criar Agendamento'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminBookingPage;
