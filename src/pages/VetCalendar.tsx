
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const VetCalendar = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedDate && user) {
      fetchAppointments();
    }
  }, [selectedDate, user]);

  const fetchAppointments = async () => {
    if (!selectedDate || !user) return;
    
    setIsLoading(true);
    try {
      // Get the staff profile for this user
      const { data: staffProfile, error: profileError } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('can_vet', true)
        .single();

      if (profileError || !staffProfile) {
        console.error('Staff profile not found:', profileError);
        setAppointments([]);
        return;
      }

      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Get appointments assigned to this staff member
      const { data: appointmentStaff, error: staffError } = await supabase
        .from('appointment_staff')
        .select(`
          appointment_id,
          appointments!inner(
            id,
            date,
            time,
            status,
            notes,
            pets(name),
            services(name),
            clients(name)
          )
        `)
        .eq('staff_profile_id', staffProfile.id)
        .eq('appointments.date', dateStr)
        .order('appointments.time');

      if (staffError) throw staffError;

      // Transform the data
      const transformedAppointments = (appointmentStaff || []).map((item: any) => ({
        id: item.appointments.id,
        pet_name: item.appointments.pets?.name || 'Pet',
        service: item.appointments.services?.name || 'Serviço',
        owner_name: item.appointments.clients?.name || 'Cliente',
        time: item.appointments.time,
        status: item.appointments.status,
        notes: item.appointments.notes,
      }));

      setAppointments(transformedAppointments);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast.error('Erro ao carregar consultas');
    } finally {
      setIsLoading(false);
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
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Calendário Veterinário</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Data</CardTitle>
              <CardDescription>
                Escolha uma data para ver as consultas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Consultas para {selectedDate?.toLocaleDateString('pt-BR')}
              </CardTitle>
              <CardDescription>
                {appointments.length} consulta(s) encontrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando...</p>
              ) : appointments.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma consulta para esta data.</p>
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
                          {appointment.status === 'pending' ? 'Agendado' :
                           appointment.status === 'completed' ? 'Concluído' :
                           'Cancelado'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm mb-2"><strong>Serviço:</strong> {appointment.service}</p>
                      {appointment.notes && (
                        <p className="text-sm mb-2"><strong>Observações:</strong> {appointment.notes}</p>
                      )}
                      
                      {appointment.status === 'pending' && (
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
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default VetCalendar;
