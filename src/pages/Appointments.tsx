
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import AppointmentCard, { Appointment } from '@/components/AppointmentCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dog } from 'lucide-react';

// Dados de exemplo de agendamentos
const initialAppointments: Appointment[] = [
  {
    id: '1',
    petName: 'Max',
    service: 'Tosa Completa',
    date: new Date(2023, 11, 28),
    time: '10:00',
    status: 'upcoming',
  },
  {
    id: '2',
    petName: 'Bella',
    service: 'Banho & Escovação Básica',
    date: new Date(2024, 0, 5),
    time: '14:00',
    status: 'upcoming',
  },
  {
    id: '3',
    petName: 'Charlie',
    service: 'Corte de Unhas',
    date: new Date(2023, 10, 15),
    time: '11:00',
    status: 'completed',
  },
  {
    id: '4',
    petName: 'Luna',
    service: 'Pacote Spa Luxo',
    date: new Date(2023, 9, 30),
    time: '13:00',
    status: 'cancelled',
  },
];

const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  
  const cancelAppointment = (id: string) => {
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
              {upcomingAppointments.length > 0 ? (
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
              {pastAppointments.length > 0 ? (
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
