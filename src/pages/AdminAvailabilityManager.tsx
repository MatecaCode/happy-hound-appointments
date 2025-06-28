
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, Users, Shower, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Provider {
  id: string;
  user_id: string;
  type: string;
  name: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  hasAppointment: boolean;
  appointmentDetails?: {
    id: string;
    pet_name: string;
    user_name: string;
    service_name: string;
  };
}

interface ShowerSlot {
  time: string;
  availableSpots: number;
  maxSpots: number;
}

const AdminAvailabilityManager = () => {
  const { user, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'provider' | 'shower'>('provider');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [showerSlots, setShowerSlots] = useState<ShowerSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchProviders();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedDate) {
      if (selectedType === 'provider' && selectedProvider) {
        fetchProviderAvailability();
      } else if (selectedType === 'shower') {
        fetchShowerAvailability();
      }
    }
  }, [selectedDate, selectedProvider, selectedType]);

  const fetchProviders = async () => {
    try {
      const { data: providerProfiles, error } = await supabase
        .from('provider_profiles')
        .select('*');

      if (error) throw error;

      if (!providerProfiles) {
        setProviders([]);
        return;
      }

      // Get names for providers
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
            id: profile.id,
            user_id: profile.user_id,
            type: profile.type,
            name
          };
        })
      );

      setProviders(providersWithNames);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Erro ao carregar profissionais');
    }
  };

  const fetchProviderAvailability = async () => {
    if (!selectedDate || !selectedProvider) return;

    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Get provider availability
      const { data: availability, error: availError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', selectedProvider)
        .eq('date', dateStr);

      if (availError) throw availError;

      // Get appointments for this provider and date
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select(`
          id,
          time,
          pets:pet_id (name),
          services:service_id (name),
          clients:user_id (name),
          appointment_providers!inner(provider_id)
        `)
        .eq('appointment_providers.provider_id', selectedProvider)
        .eq('date', dateStr)
        .in('status', ['pending', 'confirmed']);

      if (apptError) throw apptError;

      // Generate time slots
      const slots: TimeSlot[] = [];
      for (let hour = 9; hour < 17; hour++) {
        for (const minutes of [0, 30]) {
          if (hour === 16 && minutes === 30) break;
          
          const timeStr = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          const availabilityRecord = availability?.find(a => a.time_slot === timeStr + ':00');
          const appointment = appointments?.find(a => a.time === timeStr + ':00');
          
          slots.push({
            time: timeStr,
            available: availabilityRecord ? availabilityRecord.available : true,
            hasAppointment: !!appointment,
            appointmentDetails: appointment ? {
              id: appointment.id,
              pet_name: appointment.pets?.name || 'Pet',
              user_name: appointment.clients?.name || 'Cliente',
              service_name: appointment.services?.name || 'Serviço'
            } : undefined
          });
        }
      }

      setTimeSlots(slots);
    } catch (error) {
      console.error('Error fetching provider availability:', error);
      toast.error('Erro ao carregar disponibilidade do profissional');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShowerAvailability = async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      const { data: showerData, error } = await supabase
        .from('shower_availability')
        .select('*')
        .eq('date', dateStr)
        .order('time_slot');

      if (error) throw error;

      const slots: ShowerSlot[] = [];
      for (let hour = 9; hour < 17; hour++) {
        for (const minutes of [0, 30]) {
          if (hour === 16 && minutes === 30) break;
          
          const timeStr = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          const showerRecord = showerData?.find(s => s.time_slot === timeStr);
          
          slots.push({
            time: timeStr.substring(0, 5),
            availableSpots: showerRecord ? showerRecord.available_spots : 5,
            maxSpots: 5
          });
        }
      }

      setShowerSlots(slots);
    } catch (error) {
      console.error('Error fetching shower availability:', error);
      toast.error('Erro ao carregar disponibilidade do banho');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProviderAvailability = async (timeSlot: string) => {
    if (!selectedDate || !selectedProvider) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const slot = timeSlots.find(s => s.time === timeSlot);
    if (!slot) return;

    if (slot.hasAppointment) {
      const confirmChange = window.confirm(
        `Este horário tem um agendamento (${slot.appointmentDetails?.pet_name} - ${slot.appointmentDetails?.service_name}). ` +
        'Alterar a disponibilidade pode afetar o agendamento. Deseja continuar?'
      );
      if (!confirmChange) return;
    }

    const newAvailability = !slot.available;

    try {
      const { error } = await supabase
        .from('provider_availability')
        .upsert({
          provider_id: selectedProvider,
          date: dateStr,
          time_slot: timeSlot + ':00',
          available: newAvailability
        }, {
          onConflict: 'provider_id,date,time_slot'
        });

      if (error) throw error;

      // Update local state
      setTimeSlots(prev =>
        prev.map(s =>
          s.time === timeSlot ? { ...s, available: newAvailability } : s
        )
      );

      toast.success(`Disponibilidade ${newAvailability ? 'habilitada' : 'desabilitada'} para ${timeSlot}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  const updateShowerCapacity = async (timeSlot: string, newCapacity: number) => {
    if (!selectedDate) return;

    const dateStr = selectedDate.toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('shower_availability')
        .upsert({
          date: dateStr,
          time_slot: timeSlot + ':00',
          available_spots: newCapacity
        }, {
          onConflict: 'date,time_slot'
        });

      if (error) throw error;

      // Update local state
      setShowerSlots(prev =>
        prev.map(s =>
          s.time === timeSlot.substring(0, 5) ? { ...s, availableSpots: newCapacity } : s
        )
      );

      toast.success(`Capacidade de banho atualizada para ${timeSlot}`);
    } catch (error) {
      console.error('Error updating shower capacity:', error);
      toast.error('Erro ao atualizar capacidade de banho');
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
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Disponibilidade</h1>
            <p className="text-gray-600">
              Controle completo sobre horários disponíveis por profissional e serviços de banho
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Selecionar Data
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

            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="type-select">Tipo de Gerenciamento</Label>
                  <Select value={selectedType} onValueChange={(value: 'provider' | 'shower') => setSelectedType(value)}>
                    <SelectTrigger id="type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provider">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Profissionais
                        </div>
                      </SelectItem>
                      <SelectItem value="shower">
                        <div className="flex items-center gap-2">
                          <Shower className="h-4 w-4" />
                          Banho e Tosa
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedType === 'provider' && (
                  <div>
                    <Label htmlFor="provider-select">Profissional</Label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : 'Selecione uma data'}
                </CardTitle>
                <CardDescription>
                  {selectedType === 'provider' 
                    ? 'Gerenciar horários do profissional selecionado'
                    : 'Gerenciar capacidade de banho e tosa'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : selectedType === 'provider' ? (
                  !selectedProvider ? (
                    <p className="text-muted-foreground text-center py-8">
                      Selecione um profissional para ver a disponibilidade
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {timeSlots.map((slot) => (
                        <div key={slot.time} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{slot.time}</span>
                              {slot.hasAppointment && (
                                <Badge variant="outline" className="text-xs">
                                  {slot.appointmentDetails?.pet_name} - {slot.appointmentDetails?.service_name}
                                </Badge>
                              )}
                            </div>
                            {slot.hasAppointment && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Cliente: {slot.appointmentDetails?.user_name}
                              </p>
                            )}
                          </div>
                          <Switch
                            checked={slot.available}
                            onCheckedChange={() => toggleProviderAvailability(slot.time)}
                          />
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {showerSlots.map((slot) => (
                      <div key={slot.time} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <span className="font-medium">{slot.time}</span>
                          <p className="text-xs text-muted-foreground">
                            {slot.availableSpots} de {slot.maxSpots} vagas disponíveis
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateShowerCapacity(slot.time, Math.max(0, slot.availableSpots - 1))}
                            disabled={slot.availableSpots <= 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{slot.availableSpots}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateShowerCapacity(slot.time, Math.min(slot.maxSpots, slot.availableSpots + 1))}
                            disabled={slot.availableSpots >= slot.maxSpots}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminAvailabilityManager;
