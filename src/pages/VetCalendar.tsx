
import React, { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// Define the Appointment interface explicitly
interface Appointment {
  id: string;
  date: string;
  time: string;
  pet_name: string;
  service: string;
  owner_name: string;
  owner_phone?: string;
  notes?: string;
  status: string;
}

const VetCalendar = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const maxDate = addMonths(new Date(), 3);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchAppointments = async () => {
      setIsLoading(true);
      try {
        // Only fetch appointments for this vet
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('provider_id', user.id)
          .eq('service_type', 'veterinary');
        
        if (error) {
          throw error;
        }
        
        setAppointments(data || []);
      } catch (error: any) {
        console.error('Error fetching appointments:', error.message);
        toast.error('Erro ao carregar agendamentos');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppointments();
  }, [user]);
  
  // Filter appointments for the selected date
  const selectedDateAppointments = appointments.filter(
    (apt) => apt.date === format(date, 'yyyy-MM-dd')
  );
  
  if (!user || user.user_metadata.role !== 'vet') {
    return (
      <Layout>
        <div className="py-16 px-6 text-center">
          <h1 className="mb-4 text-2xl font-bold">Acesso Restrito</h1>
          <p>Esta página é apenas para veterinários.</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Calendário <span className="text-primary">Veterinário</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Gerencie seus agendamentos de consultas veterinárias.
          </p>
        </div>
      </section>
      
      <div className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Calendário</CardTitle>
                <CardDescription>
                  Selecione uma data para ver os agendamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  className="rounded-md border shadow"
                  fromDate={new Date()}
                  toDate={maxDate}
                />
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  Agendamentos para {format(date, 'dd/MM/yyyy')}
                </CardTitle>
                <CardDescription>
                  {selectedDateAppointments.length === 0 
                    ? 'Não há agendamentos para esta data' 
                    : `${selectedDateAppointments.length} agendamento(s) encontrado(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8">Carregando agendamentos...</p>
                ) : (
                  <div className="space-y-4">
                    {selectedDateAppointments.map((appointment) => (
                      <Card key={appointment.id}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-semibold">{appointment.time} - {appointment.service}</p>
                              <p className="text-sm">Pet: {appointment.pet_name}</p>
                            </div>
                            <div>
                              <p className="text-sm">Cliente: {appointment.owner_name}</p>
                              {appointment.owner_phone && (
                                <p className="text-sm">Telefone: {appointment.owner_phone}</p>
                              )}
                              {appointment.notes && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Observações: {appointment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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

export default VetCalendar;
