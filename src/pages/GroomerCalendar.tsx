
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AlignRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { addMonths, subMonths } from 'date-fns';

// Define the appointment type explicitly without circular references
interface Appointment {
  id: string;
  pet_name: string;
  service: string;
  date: string;
  time: string;
  owner_name: string;
  owner_phone: string | null;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string | null;
  created_at: string;
  pet_id: string;
  service_id: string | null;
  provider_id: string | null;
  user_id: string;
  service_type?: string;
}

const GroomerCalendar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Define date range for calendar (3 months)
  const fromDate = subMonths(new Date(), 1);
  const toDate = addMonths(new Date(), 2);
  
  useEffect(() => {
    // Verificar se o usuário é tosador
    if (user && user.user_metadata?.role !== 'groomer') {
      toast.error('Você não tem permissão para acessar esta página');
      navigate('/');
      return;
    }
    
    const fetchAppointments = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        // Type-safe database query
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('date', formattedDate)
          .eq('service_type', 'grooming')
          .order('time');
        
        if (error) throw error;
        
        // Safely assign the data to the appointments state
        setAppointments(data as Appointment[]);
      } catch (error: any) {
        toast.error(error.message || 'Erro ao carregar agendamentos');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppointments();
  }, [user, date, navigate]);
  
  const updateAppointmentStatus = async (id: string, status: 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      // Atualizar localmente
      setAppointments(appointments.map(apt => 
        apt.id === id ? { ...apt, status } : apt
      ));
      
      toast.success(`Status do agendamento atualizado para ${status === 'completed' ? 'concluído' : 'cancelado'}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status');
    }
  };
  
  const renderAppointments = () => {
    if (isLoading) {
      return <p className="text-center py-6">Carregando agendamentos...</p>;
    }
    
    if (appointments.length === 0) {
      return (
        <div className="text-center py-10 bg-secondary/30 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Nenhum agendamento para este dia</h3>
          <p className="text-muted-foreground">
            Não há agendamentos para {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">
          Agendamentos para {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        
        {appointments.map((appointment) => (
          <Card key={appointment.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className={`p-4 border-l-4 ${
                appointment.status === 'completed' ? 'border-green-500 bg-green-50' :
                appointment.status === 'cancelled' ? 'border-red-500 bg-red-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-lg">{appointment.time} - {appointment.pet_name}</h4>
                    <p className="text-sm text-muted-foreground">{appointment.service}</p>
                  </div>
                  
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {appointment.status === 'completed' ? 'Concluído' :
                     appointment.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                  </div>
                </div>
                
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full mt-2 flex items-center justify-center">
                      <AlignRight className="mr-2 h-4 w-4" />
                      Detalhes
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 pt-3 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h5 className="text-sm font-medium">Informações do Cliente</h5>
                          <p className="text-sm">Nome: {appointment.owner_name}</p>
                          <p className="text-sm">Telefone: {appointment.owner_phone || 'Não informado'}</p>
                        </div>
                        {appointment.notes && (
                          <div>
                            <h5 className="text-sm font-medium">Observações</h5>
                            <p className="text-sm">{appointment.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      {appointment.status === 'upcoming' && (
                        <div className="flex gap-2 mt-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          >
                            Marcar como Concluído
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  if (!user) {
    return (
      <Layout>
        <div className="py-16 px-6 text-center">
          <h1>Faça login para acessar o calendário de tosador</h1>
          <Button asChild className="mt-4">
            <a href="/login">Entrar</a>
          </Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Calendário de <span className="text-primary">Tosas</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Gerencie os agendamentos e serviços de tosa
          </p>
        </div>
      </section>
      
      <div className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Card>
                <CardContent className="p-4">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    className="mx-auto pointer-events-auto"
                    locale={ptBR}
                    fromDate={fromDate}
                    toDate={toDate}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              {renderAppointments()}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GroomerCalendar;
