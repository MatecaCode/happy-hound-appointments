
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
import { createAppointment, trackAdminAction } from '@/utils/appointmentUtils';
import { toast } from 'sonner';
import { Users, PawPrint, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string; // Updated for Phase 1: now using clients.id
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
  default_duration: number;
  base_price: number;
}

interface Staff {
  id: string; // This is staff_profile_id
  user_id: string;
  name: string;
  can_bathe: boolean;
  can_groom: boolean;
  can_vet: boolean;
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
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
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
      fetchStaff();
    } else {
      setStaff([]);
      setSelectedStaff('');
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedDate && selectedService && (selectedStaff || !requiresStaff())) {
      fetchTimeSlots();
    } else {
      setTimeSlots([]);
      setSelectedTime('');
    }
  }, [selectedDate, selectedService, selectedStaff]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, user_id, name')
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
        .eq('client_id', selectedClient) // Updated for Phase 1: using client_id
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
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    }
  };

  const fetchStaff = async () => {
    if (!selectedService) return;

    const service = services.find(s => s.id === selectedService);
    if (!service) return;

    try {
      // Updated for Phase 1: Use staff_profiles and staff_services
      const { data: staffData, error } = await supabase
        .from('staff_profiles')
        .select(`
          id,
          user_id,
          name,
          can_bathe,
          can_groom,
          can_vet,
          staff_services!inner(service_id)
        `)
        .eq('active', true)
        .eq('staff_services.service_id', selectedService);

      if (error) throw error;

      setStaff(staffData || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Erro ao carregar profissionais');
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedDate || !selectedService) return;

    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Use the new Phase 1 RPC function
      const { data: availableSlots, error } = await supabase
        .rpc('get_available_slots_for_service', {
          _service_id: selectedService,
          _date: dateStr,
          _staff_profile_id: selectedStaff || null
        });

      if (error) throw error;

      // Convert to TimeSlot format
      const slots: TimeSlot[] = (availableSlots || []).map((slot: any) => ({
        time: slot.time_slot?.substring(0, 5) || slot, // Handle both formats
        available: true
      }));

      setTimeSlots(slots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Erro ao carregar horários disponíveis');
    } finally {
      setIsLoading(false);
    }
  };

  const requiresStaff = () => {
    if (!selectedService) return false;
    const service = services.find(s => s.id === selectedService);
    return service?.service_type === 'grooming' || service?.service_type === 'veterinary';
  };

  const handleSubmit = async () => {
    if (!selectedClient || !selectedPet || !selectedService || !selectedDate || !selectedTime) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (requiresStaff() && !selectedStaff) {
      toast.error('Por favor, selecione um profissional');
      return;
    }

    // Get client's user_id for the booking
    const selectedClientData = clients.find(c => c.id === selectedClient);
    if (!selectedClientData) {
      toast.error('Dados do cliente não encontrados');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔥 [ADMIN_BOOKING] Creating admin override booking:', {
        user_id: selectedClientData.user_id,
        pet_id: selectedPet,
        service_id: selectedService,
        staff_profile_id: selectedStaff,
        date: selectedDate,
        time: selectedTime + ':00',
        notes,
        is_admin_override: true
      });

      const result = await createAppointment(
        selectedClientData.user_id, // Use client's user_id
        selectedPet,
        selectedService,
        selectedStaff || null, // Pass staff_profile_id directly
        selectedDate,
        selectedTime + ':00',
        notes || undefined,
        true // Mark as admin override
      );

      if (result.success) {
        toast.success('Agendamento criado com sucesso!');
        
        // 🆕 ADDITIONAL: Track the specific admin override action
        if (user?.id && result.appointmentId) {
          try {
            await trackAdminAction(
              user.id,
              'create_appointment',
              'appointment',
              result.appointmentId,
              'Admin created booking for client',
              null,
              {
                client_id: selectedClient,
                pet_id: selectedPet,
                service_id: selectedService,
                staff_profile_id: selectedStaff,
                booking_date: selectedDate.toISOString().split('T')[0],
                time_slot: selectedTime,
                created_via: 'admin_panel'
              },
              `Admin ${user.email} created booking for client ${selectedClientData.name}`
            );
          } catch (trackingError) {
            console.error('Failed to track admin action:', trackingError);
            // Don't fail the booking if tracking fails
          }
        }

        // Reset form
        setSelectedClient('');
        setSelectedPet('');
        setSelectedService('');
        setSelectedStaff('');
        setSelectedDate(undefined);
        setSelectedTime('');
        setNotes('');
        setClientPets([]);
        setStaff([]);
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
            <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ Agendamentos criados aqui são registrados como override administrativo
            </div>
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
                          <SelectItem key={client.id} value={client.id}>
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
                            {service.name} - R$ {service.base_price?.toFixed(2) || '0.00'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {requiresStaff() && (
                    <div>
                      <Label htmlFor="staff-select">Profissional</Label>
                      <Select value={selectedStaff} onValueChange={setSelectedStaff} disabled={!selectedService}>
                        <SelectTrigger id="staff-select">
                          <SelectValue placeholder="Selecione um profissional" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({
                                member.can_vet ? 'Veterinário' :
                                member.can_groom ? 'Tosador' :
                                member.can_bathe ? 'Banhista' : 'Staff'
                              })
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
              disabled={isLoading || !selectedClient || !selectedPet || !selectedService || !selectedDate || !selectedTime || (requiresStaff() && !selectedStaff)}
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
                  Criar Agendamento (Admin Override)
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
