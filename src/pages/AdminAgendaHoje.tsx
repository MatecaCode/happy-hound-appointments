import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Clock, 
  RefreshCw, 
  Calendar,
  PawPrint,
  User,
  Scissors,
  Bath,
  Stethoscope
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';

interface AppointmentData {
  appointment_id: string;
  date: string;
  time: string;
  duration: number;
  service_name: string;
  pet_name: string;
  client_name: string;
  staff_id: string;
  staff_name: string;
  can_bathe: boolean;
  can_groom: boolean;
  can_vet: boolean;
}

interface StaffColumn {
  id: string;
  name: string;
  type: string;
  appointments: AppointmentData[];
}

const AdminAgendaHoje = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [staffColumns, setStaffColumns] = useState<StaffColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // Generate time slots from 08:00 to 18:00 in 30-minute intervals
  useEffect(() => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break; // Stop at 18:00
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    setTimeSlots(slots);
  }, []);

  useEffect(() => {
    fetchTodayAppointments();
  }, [fetchTodayAppointments]);

  const fetchTodayAppointments = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          duration,
          services!inner(name),
          pets!inner(name),
          clients!inner(name),
          appointment_staff!inner(
            staff_profiles!inner(
              id,
              name,
              can_bathe,
              can_groom,
              can_vet
            )
          )
        `)
        .eq('date', new Date().toISOString().split('T')[0])
        .order('time');

      if (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Erro ao carregar agendamentos');
        return;
      }

      // Transform the data to match our interface
      const transformedData: AppointmentData[] = data?.map((appointment: {
        id: string;
        date: string;
        time: string;
        duration?: number;
        services: { name: string };
        pets: { name: string };
        clients: { name: string };
        appointment_staff: Array<{
          staff_profiles: {
            id: string;
            name: string;
            can_bathe: boolean;
            can_groom: boolean;
            can_vet: boolean;
          };
        }>;
      }) => ({
        appointment_id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration || 60,
        service_name: appointment.services.name,
        pet_name: appointment.pets.name,
        client_name: appointment.clients.name,
        staff_id: appointment.appointment_staff[0]?.staff_profiles.id,
        staff_name: appointment.appointment_staff[0]?.staff_profiles.name,
        can_bathe: appointment.appointment_staff[0]?.staff_profiles.can_bathe,
        can_groom: appointment.appointment_staff[0]?.staff_profiles.can_groom,
        can_vet: appointment.appointment_staff[0]?.staff_profiles.can_vet,
      })) || [];

      setAppointments(transformedData);
      organizeStaffColumns(transformedData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }, [organizeStaffColumns]);

  const organizeStaffColumns = useCallback((appointments: AppointmentData[]) => {
    // Group appointments by staff
    const staffMap = new Map<string, StaffColumn>();
    
    appointments.forEach(appointment => {
      if (!staffMap.has(appointment.staff_id)) {
        const staffType = getStaffType(appointment);
        staffMap.set(appointment.staff_id, {
          id: appointment.staff_id,
          name: appointment.staff_name,
          type: staffType,
          appointments: []
        });
      }
      staffMap.get(appointment.staff_id)!.appointments.push(appointment);
    });

    setStaffColumns(Array.from(staffMap.values()));
  }, []);

  const getStaffType = (appointment: AppointmentData): string => {
    if (appointment.can_vet) return 'Veterinário';
    if (appointment.can_groom) return 'Groomer';
    if (appointment.can_bathe) return 'Banhista';
    return 'Staff';
  };

  const getServiceIcon = (serviceName: string) => {
    const lowerName = serviceName.toLowerCase();
    if (lowerName.includes('banho')) return <Bath className="h-4 w-4" />;
    if (lowerName.includes('tosa')) return <Scissors className="h-4 w-4" />;
    if (lowerName.includes('consulta') || lowerName.includes('veterinário')) return <Stethoscope className="h-4 w-4" />;
    return <PawPrint className="h-4 w-4" />;
  };

  const getServiceColor = (serviceName: string) => {
    const lowerName = serviceName.toLowerCase();
    if (lowerName.includes('banho')) return 'bg-blue-100 border-blue-200 text-blue-800';
    if (lowerName.includes('tosa')) return 'bg-purple-100 border-purple-200 text-purple-800';
    if (lowerName.includes('consulta') || lowerName.includes('veterinário')) return 'bg-red-100 border-red-200 text-red-800';
    return 'bg-gray-100 border-gray-200 text-gray-800';
  };

  const getAppointmentForTimeSlot = (staffId: string, timeSlot: string): AppointmentData | null => {
    return appointments.find(appointment => 
      appointment.staff_id === staffId && 
      appointment.time === timeSlot
    ) || null;
  };

  const getAppointmentHeight = (duration: number): string => {
    // Each 30-minute slot is 60px, so calculate height based on duration
    const slots = Math.ceil(duration / 30);
    return `${slots * 60}px`;
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Agenda de Hoje
              </h1>
              <p className="text-gray-600 mt-2">
                Visualização de todos os serviços agendados para hoje
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <Button 
                onClick={fetchTodayAppointments}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Carregando agenda...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Staff Headers */}
                <div className="grid grid-cols-[120px_repeat(auto-fit,minmax(200px,1fr))] border-b">
                  <div className="p-4 font-semibold text-gray-700 bg-gray-50">
                    Horário
                  </div>
                  {staffColumns.map((staff) => (
                    <div key={staff.id} className="p-4 text-center border-l">
                      <div className="font-semibold text-gray-900">{staff.name}</div>
                      <Badge variant="secondary" className="mt-1">
                        {staff.type}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                <div className="grid grid-cols-[120px_repeat(auto-fit,minmax(200px,1fr))]">
                  {timeSlots.map((timeSlot) => (
                    <React.Fragment key={timeSlot}>
                      {/* Time Label */}
                      <div className="p-2 text-sm text-gray-600 bg-gray-50 border-r border-b flex items-center justify-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {timeSlot}
                      </div>
                      
                      {/* Staff Columns */}
                      {staffColumns.map((staff) => {
                        const appointment = getAppointmentForTimeSlot(staff.id, timeSlot);
                        return (
                          <div key={`${staff.id}-${timeSlot}`} className="border-l border-b p-2 min-h-[60px]">
                            {appointment && (
                              <Card className={`${getServiceColor(appointment.service_name)} border-2`}>
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-1">
                                      {getServiceIcon(appointment.service_name)}
                                      <span className="font-semibold text-sm">
                                        {appointment.pet_name}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="text-xs mb-1">
                                    {appointment.service_name}
                                  </div>
                                  
                                  <div className="text-xs text-gray-600 mb-1">
                                    <User className="h-3 w-3 inline mr-1" />
                                    {appointment.client_name}
                                  </div>
                                  
                                  <div className="text-xs text-gray-500">
                                    {appointment.time} - {new Date(`2000-01-01T${appointment.time}`).getTime() + appointment.duration * 60000 > new Date(`2000-01-01T${appointment.time}`).getTime() ? 
                                      new Date(new Date(`2000-01-01T${appointment.time}`).getTime() + appointment.duration * 60000).toTimeString().slice(0, 5) : 
                                      appointment.time
                                    }
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {!loading && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Total de Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{appointments.length}</div>
                <p className="text-xs text-muted-foreground">
                  Para hoje
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Staff Ativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{staffColumns.length}</div>
                <p className="text-xs text-muted-foreground">
                  Com agendamentos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horário de Funcionamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">08:00 - 18:00</div>
                <p className="text-xs text-muted-foreground">
                  Segunda a Sexta
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAgendaHoje; 