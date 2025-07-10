
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dog, Clock, CheckCircle, XCircle, Play, AlertCircle, Calendar, User, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentWithDetails {
  id: string;
  pet_name: string;
  service_name: string;
  date: Date;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  service_status?: 'not_started' | 'in_progress' | 'completed';
  notes?: string;
  staff_name?: string;
  staff_names?: string[];
  duration?: number;
  total_price?: number;
}

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  
  // Load user's appointments from the database with detailed information
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        console.log('🔍 [APPOINTMENTS] Fetching appointments for user:', user.id);
        
        // First get client_id from user
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (clientError || !clientData) {
          console.log('❌ [APPOINTMENTS] No client record found for user:', user.id);
          setAppointments([]);
          return;
        }

        // Get appointments with related data including staff from appointment_staff
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            date,
            time,
            status,
            service_status,
            notes,
            duration,
            total_price,
            client_id,
            pets:pet_id (name),
            services:service_id (name),
            appointment_staff (
              staff_profiles (name)
            )
          `)
          .eq('client_id', clientData.id)
          .order('date', { ascending: true });
        
        if (error) {
          console.error('❌ [APPOINTMENTS] Supabase error:', error);
          throw error;
        }
        
        console.log('📊 [APPOINTMENTS] Raw appointments data:', data);
        
        if (data) {
          const formattedData = data.map((apt) => {
            // Get all staff names from appointment_staff relationship
            const staffNames = apt.appointment_staff?.map((as: any) => as.staff_profiles?.name).filter(Boolean) || [];

            return {
              id: apt.id,
              pet_name: apt.pets?.name || 'Pet',
              service_name: apt.services?.name || 'Serviço',
              date: new Date(apt.date + 'T12:00:00'),
              time: apt.time,
              status: apt.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
              service_status: apt.service_status as 'not_started' | 'in_progress' | 'completed' | undefined,
              notes: apt.notes || undefined,
              staff_names: staffNames,
              staff_name: staffNames.length > 0 ? staffNames.join(', ') : undefined,
              duration: apt.duration || 60,
              total_price: apt.total_price || 0
            };
          });
          
          console.log('✅ [APPOINTMENTS] Formatted appointments:', formattedData);
          setAppointments(formattedData);
        }
      } catch (error: any) {
        console.error('❌ [APPOINTMENTS] Error fetching appointments:', error.message);
        toast.error('Erro ao carregar os agendamentos');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppointments();
  }, [user]);
  
  const cancelAppointment = async (appointmentId: string) => {
    setCancellingId(appointmentId);
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;

      // Update appointment status to cancelled
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);
      
      if (updateError) throw updateError;

      // Get provider IDs from appointment_providers_legacy (this is what booking uses)
      const { data: providerLinks } = await supabase
        .from('appointment_providers_legacy')
        .select('provider_id')
        .eq('appointment_id', appointmentId);

      if (providerLinks && providerLinks.length > 0) {
        const serviceDuration = appointment.duration || 60;
        const appointmentDate = new Date(appointment.date + 'T12:00:00').toISOString().split('T')[0];
        
        console.log(`🔄 [CANCEL] Freeing availability for ${providerLinks.length} providers, duration: ${serviceDuration}min, date: ${appointmentDate}`);
        
        for (const providerLink of providerLinks) {
          console.log(`🔄 [CANCEL] Processing provider ${providerLink.provider_id}`);
          
          // Calculate all time slots that need to be freed up - EXACT SAME LOGIC AS BOOKING
          const appointmentTime = appointment.time; // e.g., "15:00:00"
          const [hours, minutes] = appointmentTime.split(':').map(Number);
          
          // Use the same logic as create_booking_atomic function
          let checkMinutes = 0;
          while (checkMinutes < serviceDuration) {
            // Calculate the exact time slot
            const totalMinutes = minutes + checkMinutes;
            const slotHours = hours + Math.floor(totalMinutes / 60);
            const slotMinutes = totalMinutes % 60;
            
            const timeSlot = `${String(slotHours).padStart(2, '0')}:${String(slotMinutes).padStart(2, '0')}:00`;
            
            console.log(`🔄 [CANCEL] Freeing slot ${timeSlot} for provider ${providerLink.provider_id} on ${appointmentDate}`);
            
            // Free up this time slot in provider_availability_legacy (same table used by booking)
            const { error: updateError } = await supabase
              .from('provider_availability_legacy')
              .update({ available: true })
              .eq('provider_id', providerLink.provider_id)
              .eq('date', appointmentDate)
              .eq('time_slot', timeSlot);
              
            if (updateError) {
              console.error(`❌ Error freeing slot ${timeSlot}:`, updateError);
            } else {
              console.log(`✅ Freed slot ${timeSlot} for provider ${providerLink.provider_id}`);
            }
            
            checkMinutes += 30;
          }
        }
      }
      
      // Update local state
      setAppointments(prevAppointments =>
        prevAppointments.map(apt => 
          apt.id === appointmentId
            ? { ...apt, status: 'cancelled' as const }
            : apt
        )
      );
      
      toast.success(`Agendamento para ${appointment.pet_name} foi cancelado.`, {
        style: {
          background: '#EF4444',
          color: 'white',
          border: 'none'
        }
      });
    } catch (error: any) {
      console.error('❌ [APPOINTMENTS] Error cancelling appointment:', error.message);
      toast.error('Erro ao cancelar agendamento');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string, serviceStatus?: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Aguardando Aprovação
          </Badge>
        );
      case 'confirmed':
        // Show service status for confirmed appointments
        if (serviceStatus) {
          switch (serviceStatus) {
            case 'not_started':
              return (
                <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Confirmado - Não Iniciado
                </Badge>
              );
            case 'in_progress':
              return (
                <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                  <Play className="w-3 h-3 mr-1" />
                  Em Andamento
                </Badge>
              );
            case 'completed':
              return (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Serviço Concluído
                </Badge>
              );
          }
        }
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmado
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return null;
    }
  };

  const AppointmentDetailCard = ({ appointment }: { appointment: AppointmentWithDetails }) => (
    <Dialog>
      <DialogTrigger asChild>
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <Dog className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">{appointment.pet_name}</h3>
                <p className="text-sm text-muted-foreground">{appointment.service_name}</p>
              </div>
            </div>
            {getStatusBadge(appointment.status, appointment.service_status)}
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{format(appointment.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{appointment.time} ({appointment.duration}min)</span>
            </div>
            {appointment.staff_names && appointment.staff_names.length > 0 && (
              <div className="flex items-center text-sm">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{appointment.staff_names.join(', ')}</span>
              </div>
            )}
          </div>

          {appointment.status === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Seu agendamento está pendente de aprovação pela clínica.
              </p>
            </div>
          )}
        </div>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dog className="h-5 w-5 text-primary" />
            {appointment.pet_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Status:</span>
            {getStatusBadge(appointment.status, appointment.service_status)}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Serviço:</span>
              <span className="text-sm">{appointment.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Data:</span>
              <span className="text-sm">{format(appointment.date, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Horário:</span>
              <span className="text-sm">{appointment.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Duração:</span>
              <span className="text-sm">{appointment.duration} minutos</span>
            </div>
            {appointment.staff_names && appointment.staff_names.length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Profissionais:</span>
                <span className="text-sm">{appointment.staff_names.join(', ')}</span>
              </div>
            )}
            {appointment.total_price && appointment.total_price > 0 && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Valor:</span>
                <span className="text-sm text-green-600 font-medium">R$ {appointment.total_price.toFixed(2)}</span>
              </div>
            )}
            {appointment.notes && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Observações:</span>
                <span className="text-sm text-muted-foreground">{appointment.notes}</span>
              </div>
            )}
          </div>

          {appointment.status === 'pending' && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                cancelAppointment(appointment.id);
              }}
              disabled={cancellingId === appointment.id}
              className="w-full"
            >
              {cancellingId === appointment.id ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancelar Agendamento
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

  const upcomingAppointments = appointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    appointmentDate.setHours(0, 0, 0, 0); // Reset time for comparison
    
    // Upcoming: future dates OR today with pending/confirmed status
    return (appointmentDate >= today && (apt.status === 'pending' || apt.status === 'confirmed')) ||
           (appointmentDate.getTime() === today.getTime() && (apt.status === 'pending' || apt.status === 'confirmed'));
  });
  
  const pastAppointments = appointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    appointmentDate.setHours(0, 0, 0, 0); // Reset time for comparison
    
    // Past: past dates OR completed/cancelled appointments
    return appointmentDate < today || apt.status === 'completed' || apt.status === 'cancelled';
  });

  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Meus <span className="text-primary">Agendamentos</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Visualize e gerencie todos os seus agendamentos de serviços.
          </p>
        </div>
      </section>
      
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="upcoming">
                Próximos {upcomingAppointments.length > 0 && `(${upcomingAppointments.length})`}
              </TabsTrigger>
              <TabsTrigger value="past">
                Passados {pastAppointments.length > 0 && `(${pastAppointments.length})`}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming">
              {isLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Carregando agendamentos...</p>
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingAppointments.map(appointment => (
                    <AppointmentDetailCard 
                      key={appointment.id}
                      appointment={appointment}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/30 rounded-lg">
                  <Dog className="w-12 h-12 mx-auto mb-4 text-primary opacity-70" />
                  <h3 className="text-xl font-bold mb-2">Nenhum Agendamento Próximo</h3>
                  <p className="text-muted-foreground mb-6">
                    Você não tem nenhum agendamento próximo.
                  </p>
                  <Button asChild>
                    <Link to="/book">Agendar um Serviço</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past">
              {isLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Carregando agendamentos...</p>
                </div>
              ) : pastAppointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastAppointments.map(appointment => (
                    <AppointmentDetailCard 
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
