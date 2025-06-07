
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import AppointmentCard, { Appointment } from '@/components/AppointmentCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dog } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load user's appointments from the database
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true });
        
        if (error) throw error;
        
        if (data) {
          const formattedData = data.map(apt => ({
            id: apt.id,
            petName: apt.pet_name,
            service: apt.service,
            date: new Date(apt.date),
            time: apt.time,
            status: apt.status as 'upcoming' | 'completed' | 'cancelled',
          }));
          
          setAppointments(formattedData);
        }
      } catch (error: any) {
        console.error('Error fetching appointments:', error.message);
        toast.error('Erro ao carregar os agendamentos');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppointments();
  }, [user]);
  
  const cancelAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setAppointments(
        appointments.map(appointment => 
          appointment.id === id
            ? { ...appointment, status: 'cancelled' as const }
            : appointment
        )
      );
      
      const appointment = appointments.find(a => a.id === id);
      if (appointment) {
        toast.success(`Agendamento para ${appointment.petName} foi cancelado.`);
      }
    } catch (error: any) {
      console.error('Error cancelling appointment:', error.message);
      toast.error('Erro ao cancelar agendamento');
    }
  };
  
  const upcomingAppointments = appointments.filter(apt => apt.status === 'upcoming');
  const pastAppointments = appointments.filter(apt => apt.status === 'completed' || apt.status === 'cancelled');

  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Meus <span className="text-primary">Agendamentos</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Visualize e gerencie todos os seus agendamentos de tosa.
          </p>
        </div>
      </section>
      
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="upcoming">Próximos</TabsTrigger>
              <TabsTrigger value="past">Passados</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming">
              {isLoading ? (
                <div className="text-center py-10">
                  <p>Carregando agendamentos...</p>
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingAppointments.map(appointment => (
                    <AppointmentCard 
                      key={appointment.id}
                      appointment={appointment}
                      onCancel={cancelAppointment}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/30 rounded-lg">
                  <Dog className="w-12 h-12 mx-auto mb-4 text-primary opacity-70" />
                  <h3 className="text-xl font-bold mb-2">Nenhum Agendamento Próximo</h3>
                  <p className="text-muted-foreground mb-6">
                    Você não tem nenhum agendamento de tosa próximo.
                  </p>
                  <Button asChild>
                    <Link to="/book">Agendar uma Tosa</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past">
              {isLoading ? (
                <div className="text-center py-10">
                  <p>Carregando agendamentos...</p>
                </div>
              ) : pastAppointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastAppointments.map(appointment => (
                    <AppointmentCard 
                      key={appointment.id}
                      appointment={appointment}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/30 rounded-lg">
                  <Dog className="w-12 h-12 mx-auto mb-4 text-primary opacity-70" />
                  <h3 className="text-xl font-bold mb-2">Nenhum Agendamento Passado</h3>
                  <p className="text-muted-foreground mb-6">
                    Seu histórico de agendamentos aparecerá aqui depois que você tiver serviços conosco.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default Appointments;
