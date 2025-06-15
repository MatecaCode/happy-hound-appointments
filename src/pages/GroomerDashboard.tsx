
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  pet_name: string;
  service: string;
  time: string;
  owner_name: string;
  status: string;
  notes?: string;
}

interface AvailabilitySlot {
  id: string;
  time: string;
  available: boolean;
  hasAppointment: boolean;
}

const GroomerDashboard = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Generate default time slots (8am to 5pm)
  const generateDefaultSlots = (): AvailabilitySlot[] => {
    const slots: AvailabilitySlot[] = [];
    for (let hour = 8; hour < 17; hour++) {
      slots.push({
        id: `${hour}:00`,
        time: `${hour}:00`,
        available: true,
        hasAppointment: false
      });
      if (hour < 16) {
        slots.push({
          id: `${hour}:30`,
          time: `${hour}:30`,
          available: true,
          hasAppointment: false
        });
      }
    }
    return slots;
  };

  // Initialize provider availability for the next 3 months
  const initializeProviderAvailability = async () => {
    if (!user) return;
    
    console.log('🔧 Initializing provider availability for user:', user.id);
    setIsInitializing(true);
    
    try {
      // Check if user already has availability data
      const { data: existingAvailability, error: checkError } = await supabase
        .from('provider_availability')
        .select('date')
        .eq('provider_id', user.id)
        .limit(1);

      if (checkError) {
        console.error('Error checking existing availability:', checkError);
      }

      // If user already has some availability data, skip initialization
      if (existingAvailability && existingAvailability.length > 0) {
        console.log('✅ Provider already has availability data, skipping initialization');
        setIsInitializing(false);
        return;
      }

      console.log('📅 Creating availability for next 3 months...');
      
      // Generate availability for the next 3 months
      const availabilityEntries = [];
      const today = new Date();
      const endDate = new Date();
      endDate.setMonth(today.getMonth() + 3);

      // Generate time slots
      const timeSlots = generateDefaultSlots().map(slot => slot.time);

      // Loop through each day for the next 3 months
      for (let date = new Date(today); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Skip Sundays (day 0)
        if (date.getDay() === 0) continue;

        const dateStr = date.toISOString().split('T')[0];
        
        // Add all time slots for this date
        for (const timeSlot of timeSlots) {
          availabilityEntries.push({
            provider_id: user.id,
            date: dateStr,
            time_slot: timeSlot,
            available: true
          });
        }
      }

      console.log(`📊 Creating ${availabilityEntries.length} availability entries...`);

      // Insert all availability entries in batches
      const batchSize = 100;
      for (let i = 0; i < availabilityEntries.length; i += batchSize) {
        const batch = availabilityEntries.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('provider_availability')
          .insert(batch);

        if (insertError) {
          console.error('Error inserting availability batch:', insertError);
          throw insertError;
        }
      }

      console.log('✅ Provider availability initialized successfully');
      toast.success('Disponibilidade inicializada para os próximos 3 meses');
    } catch (error: any) {
      console.error('❌ Error initializing provider availability:', error);
      toast.error('Erro ao inicializar disponibilidade');
    } finally {
      setIsInitializing(false);
    }
  };

  // Initialize availability on component mount
  useEffect(() => {
    if (user) {
      initializeProviderAvailability();
    }
  }, [user]);

  useEffect(() => {
    if (selectedDate && user && !isInitializing) {
      fetchAppointments();
      fetchAvailability();
    }
  }, [selectedDate, user, isInitializing]);

  const fetchAppointments = async () => {
    if (!selectedDate || !user) return;
    
    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('provider_id', user.id)
        .eq('date', dateStr)
        .order('time');

      if (error) throw error;
      // Map raw data to Appointment structure with placeholders for missing fields
      setAppointments(
        (data || []).map((apt) => ({
          id: apt.id,
          pet_name: 'Pet',
          service: 'Serviço',
          owner_name: 'Cliente',
          time: apt.time,
          status: apt.status,
          notes: apt.notes ?? undefined,
        }))
      );
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedDate || !user) return;
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Get provider availability
      const { data: availability, error: availError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', user.id)
        .eq('date', dateStr);

      if (availError && availError.code !== 'PGRST116') {
        console.error('Error fetching availability:', availError);
      }

      // Get existing appointments for this date
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('time')
        .eq('provider_id', user.id)
        .eq('date', dateStr)
        .eq('status', 'upcoming');

      if (apptError) {
        console.error('Error fetching appointments:', apptError);
      }

      // Generate slots with availability and appointment info
      const slots = generateDefaultSlots().map(slot => {
        const providerAvailability = availability?.find(a => a.time_slot === slot.time);
        const isProviderAvailable = providerAvailability ? providerAvailability.available : true;
        const hasAppointment = appointments?.some(apt => apt.time === slot.time) || false;

        return {
          ...slot,
          available: isProviderAvailable,
          hasAppointment
        };
      });

      setAvailabilitySlots(slots);
    } catch (error: any) {
      console.error('Error fetching availability:', error);
      toast.error('Erro ao carregar disponibilidade');
    }
  };

  const toggleAvailability = async (timeSlot: string) => {
    if (!selectedDate || !user) return;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const currentSlot = availabilitySlots.find(slot => slot.time === timeSlot);
    if (!currentSlot) return;

    // Don't allow changing availability if there's an appointment
    if (currentSlot.hasAppointment) {
      toast.error('Não é possível alterar disponibilidade de horários com agendamentos');
      return;
    }

    const newAvailability = !currentSlot.available;

    try {
      const { error } = await supabase
        .from('provider_availability')
        .upsert({
          provider_id: user.id,
          date: dateStr,
          time_slot: timeSlot,
          available: newAvailability
        }, {
          onConflict: 'provider_id,date,time_slot'
        });

      if (error) throw error;

      // Update local state
      setAvailabilitySlots(prev => 
        prev.map(slot => 
          slot.time === timeSlot 
            ? { ...slot, available: newAvailability }
            : slot
        )
      );

      toast.success('Disponibilidade atualizada');
    } catch (error: any) {
      console.error('Error updating availability:', error);
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: newStatus }
            : apt
        )
      );
      
      toast.success('Status atualizado com sucesso');
      
      // Refresh availability to update hasAppointment flags
      fetchAvailability();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const isWeekend = selectedDate?.getDay() === 0; // Sunday

  if (isInitializing) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg">Inicializando sua disponibilidade...</p>
              <p className="text-sm text-muted-foreground">Configurando horários para os próximos 3 meses</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Painel do Tosador</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Data</CardTitle>
              <CardDescription>
                Escolha uma data para ver agendamentos e configurar disponibilidade
              </CardDescription>
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
              <CardTitle>
                {selectedDate?.toLocaleDateString('pt-BR')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="appointments" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
                  <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
                </TabsList>
                
                <TabsContent value="appointments" className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {appointments.length} agendamento(s) encontrado(s)
                  </div>
                  
                  {isLoading ? (
                    <p>Carregando...</p>
                  ) : appointments.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum agendamento para esta data.</p>
                  ) : (
                    <div className="space-y-4">
                      {appointments.map((appointment) => (
                        <div key={appointment.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{appointment.time}</h3>
                              <p className="text-sm text-muted-foreground">
                                {appointment.pet_name} - {appointment.owner_name}
                              </p>
                            </div>
                            <Badge variant={
                              appointment.status === 'completed' ? 'default' :
                              appointment.status === 'cancelled' ? 'destructive' :
                              'secondary'
                            }>
                              {appointment.status === 'upcoming' ? 'Agendado' :
                               appointment.status === 'completed' ? 'Concluído' :
                               'Cancelado'}
                            </Badge>
                          </div>
                          
                          <p className="text-sm mb-2"><strong>Serviço:</strong> {appointment.service}</p>
                          {appointment.notes && (
                            <p className="text-sm mb-2"><strong>Observações:</strong> {appointment.notes}</p>
                          )}
                          
                          {appointment.status === 'upcoming' && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                              >
                                Marcar como Concluído
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="availability" className="space-y-4">
                  {isWeekend ? (
                    <p className="text-muted-foreground">Não atendemos aos domingos.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {availabilitySlots.map((slot) => (
                          <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor={slot.id} className="font-medium">
                              {slot.time}
                              {slot.hasAppointment && (
                                <span className="ml-2 text-xs text-blue-600">(Agendado)</span>
                              )}
                            </Label>
                            <Switch
                              id={slot.id}
                              checked={slot.available}
                              onCheckedChange={() => toggleAvailability(slot.time)}
                              disabled={slot.hasAppointment}
                            />
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-4 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            const slotsWithoutAppointments = availabilitySlots.filter(slot => !slot.hasAppointment);
                            const allAvailable = slotsWithoutAppointments.every(slot => slot.available);
                            slotsWithoutAppointments.forEach(slot => {
                              if (slot.available === allAvailable) {
                                toggleAvailability(slot.time);
                              }
                            });
                          }}
                          className="w-full"
                        >
                          {availabilitySlots.filter(slot => !slot.hasAppointment).every(slot => slot.available) 
                            ? 'Desabilitar Tudo' 
                            : 'Habilitar Tudo'}
                        </Button>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        <p>• Horários com agendamentos não podem ter a disponibilidade alterada</p>
                        <p>• Use a aba "Agendamentos" para gerenciar seus compromissos</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default GroomerDashboard;
