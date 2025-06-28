
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createAppointment } from '@/utils/appointmentUtils';
import { toast } from 'sonner';
import { Users, PawPrint, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  user_id: string;
  name: string;
}

interface Pet {
  id: string;
  name: string;
  breed?: string;
}

interface Service {
  id: string;
  name: string;
  service_type: string;
  duration: number;
  price: number;
}

interface Provider {
  id: string;
  name: string;
  type: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const AdminBookingPage = () => {
  const { user, isAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [clientPets, setClientPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchClients();
      fetchServices();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedClient) {
      fetchClientPets();
    } else {
      setClientPets([]);
      setSelectedPet('');
    }
  }, [selectedClient]);

  useEffect(() => {
    if (selectedService) {
      fetchProviders();
    } else {
      setProviders([]);
      setSelectedProvider('');
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedDate && selectedService && (selectedProvider || !requiresProvider())) {
      fetchTimeSlots();
    } else {
      setTimeSlots([]);
      setSelectedTime('');
    }
  }, [selectedDate, selectedService, selectedProvider]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('user_id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const fetchClientPets = async () => {
    if (!selectedClient) return;

    try {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, breed')
        .eq('user_id', selectedClient)
        .order('name');

      if (error) throw error;
      setClientPets(data || []);
    } catch (error) {
      console.error('Error fetching pets:', error);
      toast.error('Erro ao carregar pets do cliente');
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    }
  };

  const fetchProviders = async () => {
    if (!selectedService) return;

    const service = services.find(s => s.id === selectedService);
    if (!service) return;

    try {
      let providerType = '';
      if (service.service_type === 'grooming') {
        providerType = 'groomer';
      } else if (service.service_type === 'veterinary') {
        providerType = 'vet';
      }

      if (providerType) {
        const { data: providerProfiles, error } = await supabase
          .from('provider_profiles')
          .select('*')
          .eq('type', providerType);

        if (error) throw error;

        if (providerProfiles) {
          const providersWithNames = await Promise.all(
            providerProfiles.map(async (profile) => {
              let name = 'Provider';
              
              if (profile.type === 'groomer') {
                const { data: groomerData } = await supabase
                  .from('groomers')
                  .select('name')
                  .eq('user_id', profile.user_id)
                  .single();
                name = groomerData?.name || 'Tosador';
              } else if (profile.type === 'vet') {
                const { data: vetData } = await supabase
                  .from('veterinarians')
                  .select('name')
                  .eq('user_id', profile.user_id)
                  .single();
                name = vetData?.name || 'Veterinário';
              }

              return {
                id: profile.user_id,
                name,
                type: profile.type
              };
            })
          );

          setProviders(providersWithNames);
        }
      } else {
        setProviders([]);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Erro ao carregar profissionais');
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedDate || !selectedService) return;

    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const service = services.find(s => s.id === selectedService);
      if (!service) return;

      // Get service requirements
      const { data: serviceResources } = await supabase
        .from('service_resources')
        .select('*')
        .eq('service_id', selectedService);

      const requiresShower = serviceResources?.some(r => r.resource_type === 'shower');
      const requiresProvider = serviceResources?.some(r => r.resource_type === 'provider');

      const slots: TimeSlot[] = [];
      for (let hour = 9; hour < 17; hour++) {
        for (const minutes of [0, 30]) {
          if (hour === 16 && minutes === 30) break;
          
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          let isAvailable = true;

          // Check provider availability if required
          if (requiresProvider && selectedProvider) {
            const { data: providerProfile } = await supabase
              .from('provider_profiles')
              .select('id')
              .eq('user_id', selectedProvider)
              .single();

            if (providerProfile) {
              const { data: providerAvail } = await supabase
                .from('provider_availability')
                .select('available')
                .eq('provider_id', providerProfile.id)
                .eq('date', dateStr)
                .eq('time_slot', timeSlot)
                .single();

              if (!providerAvail || !providerAvail.available) {
                isAvailable = false;
              }
            }
          }

          // Check shower availability if required
          if (requiresShower && isAvailable) {
            const { data: showerAvail } = await supabase
              .from('shower_availability')
              .select('available_spots')
              .eq('date', dateStr)
              .eq('time_slot', timeSlot)
              .single();

            if (!showerAvail || showerAvail.available_spots <= 0) {
              isAvailable = false;
            }
          }

          slots.push({
            time: timeSlot.substring(0, 5),
            available: isAvailable
          });
        }
      }

      setTimeSlots(slots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Erro ao carregar horários disponíveis');
    } finally {
      setIsLoading(false);
    }
  };

  const requiresProvider = () => {
    if (!selectedService) return false;
    const service = services.find(s => s.id === selectedService);
    return service?.service_type === 'grooming' || service?.service_type === 'veterinary';
  };

  const handleSubmit = async () => {
    if (!selectedClient || !selectedPet || !selectedService || !selectedDate || !selectedTime) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (requiresProvider() && !selectedProvider) {
      toast.error('Por favor, selecione um profissional');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createAppointment(
        selectedClient,
        selectedPet,
        selectedService,
        selectedProvider || null,
        selectedDate,
        selectedTime + ':00',
        notes || undefined
      );

      if (result.success) {
        toast.success('Agendamento criado com sucesso!');
        // Reset form
        setSelectedClient('');
        setSelectedPet('');
        setSelectedService('');
        setSelectedProvider('');
        setSelectedDate(undefined);
        setSelectedTime('');
        setNotes('');
        setClientPets([]);
        setProviders([]);
        setTimeSlots([]);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Erro ao criar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Acesso negado. Apenas administradores podem acessar esta página.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Agendar para Cliente</h1>
            <p className="text-gray-600">
              Crie agendamentos em nome dos clientes via telefone ou presencialmente
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="client-select">Cliente</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger id="client-select">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.user_id} value={client.user_id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="pet-select">Pet</Label>
                    <Select value={selectedPet} onValueChange={setSelectedPet} disabled={!selectedClient}>
                      <SelectTrigger id="pet-select">
                        <SelectValue placeholder="Selecione um pet" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientPets.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id}>
                            {pet.name} {pet.breed && `(${pet.breed})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PawPrint className="h-5 w-5" />
                    Informações do Serviço
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="service-select">Serviço</Label>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger id="service-select">
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - R$ {service.price.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {requiresProvider() && (
                    <div>
                      <Label htmlFor="provider-select">Profissional</Label>
                      <Select value={selectedProvider} onValueChange={setSelectedProvider} disabled={!selectedService}>
                        <SelectTrigger id="provider-select">
                          <SelectValue placeholder="Selecione um profissional" />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.name} ({provider.type === 'groomer' ? 'Tosador' : 'Veterinário'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Observações adicionais sobre o agendamento..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Data e Horário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                  />
                </CardContent>
              </Card>

              {selectedDate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Horários Disponíveis
                    </CardTitle>
                    <CardDescription>
                      {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Configure o serviço para ver horários disponíveis
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {timeSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(slot.time)}
                            disabled={!slot.available}
                            className="w-full"
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !selectedClient || !selectedPet || !selectedService || !selectedDate || !selectedTime || (requiresProvider() && !selectedProvider)}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Criando Agendamento...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Criar Agendamento
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminBookingPage;
