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
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  X,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  status: string;
  notes?: string;
}

interface StaffColumn {
  id: string;
  name: string;
  type: string;
  appointments: AppointmentData[];
}

const AdminAgendaHoje = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [staffColumns, setStaffColumns] = useState<StaffColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // Generate time slots from 09:00 to 17:00 in 30-minute intervals
  useEffect(() => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 17 && minute > 0) break; // Stop at 17:00
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    setTimeSlots(slots);
  }, []);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, selectedDate]);

  

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      console.log('Fetching appointments for:', selectedDateStr);
      
      // First, get all staff members
      const { data: staffData, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id, name, can_bathe, can_groom, can_vet')
        .order('name');

      if (staffError) {
        console.error('Error fetching staff:', staffError);
        setError(`Database connection error: ${staffError.message}`);
        return;
      }

      

      // Create staff columns
      const staffColumnsData: StaffColumn[] = staffData?.map((staff: any) => ({
        id: staff.id,
        name: staff.name,
        type: getStaffTypeFromProfile(staff),
        appointments: []
      })) || [];

      setStaffColumns(staffColumnsData);

             // Now fetch appointments for selected date
       const { data: appointmentData, error: appointmentError } = await supabase
         .from('appointments')
         .select(`
           id,
           date,
           time,
           duration,
           status,
           notes,
           services(name),
           pets(name),
           clients(name),
           appointment_staff(
             staff_profiles(
               id,
               name,
               can_bathe,
               can_groom,
               can_vet
             )
           )
         `)
         .eq('date', selectedDateStr)
         .order('time');

      if (appointmentError) {
        console.error('Error fetching appointments:', appointmentError);
        setError(appointmentError.message);
        toast.error('Erro ao carregar agendamentos');
        return;
      }

      

      // Transform the data to match our interface
      const transformedData: AppointmentData[] = appointmentData?.map((appointment: any) => {
        
        
                 return {
           appointment_id: appointment.id,
           date: appointment.date,
           time: appointment.time.slice(0, 5), // Convert "12:30:00" to "12:30"
           duration: appointment.duration || 60,
           status: appointment.status || 'pending',
           service_name: appointment.services?.name || 'Serviço não encontrado',
           pet_name: appointment.pets?.name || 'Pet não encontrado',
           client_name: appointment.clients?.name || 'Cliente não encontrado',
           staff_id: appointment.appointment_staff?.[0]?.staff_profiles?.id || '',
           staff_name: appointment.appointment_staff?.[0]?.staff_profiles?.name || 'Staff não encontrado',
           can_bathe: appointment.appointment_staff?.[0]?.staff_profiles?.can_bathe || false,
           can_groom: appointment.appointment_staff?.[0]?.staff_profiles?.can_groom || false,
           can_vet: appointment.appointment_staff?.[0]?.staff_profiles?.can_vet || false,
           notes: appointment.notes || undefined,
         };
      }) || [];

      
      setAppointments(transformedData);
      organizeStaffColumns(transformedData, staffColumnsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const getStaffTypeFromProfile = (staff: any): string => {
    // Veterinário takes priority
    if (staff.can_vet) return 'Veterinário';
    
    // Check for multiple capabilities
    const canBathe = staff.can_bathe || false;
    const canGroom = staff.can_groom || false;
    
    if (canBathe && canGroom) {
      return 'Banhista/Tosador';
    } else if (canBathe && !canGroom) {
      return 'Banhista';
    } else if (canGroom && !canBathe) {
      return 'Tosador';
    }
    
    return 'Staff';
  };

  const organizeStaffColumns = useCallback((appointments: AppointmentData[], staffColumnsData: StaffColumn[]) => {
    // Group appointments by staff
    const staffMap = new Map<string, StaffColumn>();
    
    // Initialize with all staff members
    staffColumnsData.forEach(staff => {
      staffMap.set(staff.id, { ...staff, appointments: [] });
    });
    
    // Add appointments to their respective staff
    appointments.forEach(appointment => {
      if (staffMap.has(appointment.staff_id)) {
        staffMap.get(appointment.staff_id)!.appointments.push(appointment);
      }
    });

    setStaffColumns(Array.from(staffMap.values()));
  }, []);

  const getServiceIcon = (serviceName: string) => {
    const lowerName = serviceName.toLowerCase();
    if (lowerName.includes('banho')) return <Bath className="h-4 w-4" />;
    if (lowerName.includes('tosa')) return <Scissors className="h-4 w-4" />;
    if (lowerName.includes('consulta') || lowerName.includes('veterinário')) return <Stethoscope className="h-4 w-4" />;
    return <PawPrint className="h-4 w-4" />;
  };

  const getAppointmentColor = (status: string, serviceName: string) => {
    const lowerName = serviceName.toLowerCase();
    const lowerStatus = status.toLowerCase();
    
    // Status-based colors
    if (lowerStatus === 'pending') {
      return 'bg-yellow-100 border-yellow-200 text-yellow-800';
    } else if (lowerStatus === 'confirmed' || lowerStatus === 'active') {
      return 'bg-blue-100 border-blue-200 text-blue-800';
    } else if (lowerStatus === 'completed' || lowerStatus === 'finished') {
      return 'bg-green-100 border-green-200 text-green-800';
    } else if (lowerStatus === 'cancelled') {
      return 'bg-red-100 border-red-200 text-red-800';
    }
    
    // Fallback to service-based colors
    if (lowerName.includes('banho')) return 'bg-blue-100 border-blue-200 text-blue-800';
    if (lowerName.includes('tosa')) return 'bg-purple-100 border-purple-200 text-purple-800';
    if (lowerName.includes('consulta') || lowerName.includes('veterinário')) return 'bg-red-100 border-red-200 text-red-800';
    return 'bg-gray-100 border-gray-200 text-gray-800';
  };

     const getAppointmentForTimeSlot = (staffId: string, timeSlot: string): AppointmentData | null => {
     const foundAppointment = appointments.find(appointment => {
       if (appointment.staff_id !== staffId) {
         return false;
       }
       
       const appointmentStart = appointment.time;
       const appointmentEnd = new Date(`2000-01-01T${appointment.time}`);
       appointmentEnd.setMinutes(appointmentEnd.getMinutes() + appointment.duration);
       const appointmentEndTime = appointmentEnd.toTimeString().slice(0, 5);
       
       const slotTime = timeSlot;
       
       // Check if this time slot falls within the appointment duration
       const isWithin = slotTime >= appointmentStart && slotTime < appointmentEndTime;
       
       return isWithin;
     }) || null;
     
     return foundAppointment;
   };

  const getAppointmentHeight = (duration: number): string => {
    // Each 30-minute slot is 60px, so calculate height based on duration
    const slots = Math.ceil(duration / 30);
    return `${slots * 60 - 4}px`; // Subtract 4px for padding
  };

  const getAppointmentStartSlot = (appointment: AppointmentData): number => {
    const [hours, minutes] = appointment.time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = 9 * 60; // 09:00 in minutes
    const slotMinutes = totalMinutes - startMinutes;
    return Math.floor(slotMinutes / 30);
  };

  const handleAppointmentClick = (appointment: AppointmentData) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const closeAppointmentModal = () => {
    setSelectedAppointment(null);
    setShowAppointmentModal(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  if (!user) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
            <p className="text-gray-600">Você precisa estar logado para acessar esta página.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Agenda
              </h1>
              <p className="text-gray-600 mt-2">
                Visualização de todos os serviços agendados
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button 
                  onClick={goToPreviousDay}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {formatDate(selectedDate)}
                </div>
                
                <Button 
                  onClick={goToNextDay}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button 
                  onClick={goToToday}
                  variant="outline"
                  size="sm"
                  className={selectedDate.toDateString() === new Date().toDateString() ? 'bg-blue-50 border-blue-200' : ''}
                >
                  Hoje
                </Button>
              </div>
              
              <Button 
                onClick={fetchAppointments}
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

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar dados:</h3>
            <p className="text-red-600 text-sm">{error}</p>
            <Button 
              onClick={fetchAppointments}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Tentar Novamente
            </Button>
          </div>
        )}

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
                  {timeSlots.map((timeSlot, timeIndex) => (
                    <React.Fragment key={timeSlot}>
                      {/* Time Label */}
                      <div className="p-2 text-sm text-gray-600 bg-gray-50 border-r border-b flex items-center justify-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {timeSlot}
                      </div>
                      
                      {/* Staff Columns */}
                      {staffColumns.map((staff) => {
                                                 const appointment = getAppointmentForTimeSlot(staff.id, timeSlot);
                         const isAppointmentStart = appointment && appointment.time === timeSlot;
                        
                        return (
                          <div key={`${staff.id}-${timeSlot}`} className="border-l border-b p-1 min-h-[60px] relative">
                            {isAppointmentStart && appointment && (
                              <Card 
                                className={`${getAppointmentColor(appointment.status, appointment.service_name)} border-2 cursor-pointer hover:shadow-md transition-shadow absolute inset-1 z-10`}
                                style={{ height: getAppointmentHeight(appointment.duration) }}
                                                                 onClick={() => handleAppointmentClick(appointment)}
                              >
                                <CardContent className="p-2 h-full flex flex-col justify-between">
                                  <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-1">
                                      {getServiceIcon(appointment.service_name)}
                                      <span className="font-semibold text-xs">
                                        {appointment.pet_name}
                                      </span>
                                    </div>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs"
                                    >
                                      {appointment.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs mb-1">
                                    {appointment.service_name}
                                  </div>
                                  
                                  <div className="text-xs text-gray-600">
                                    <User className="h-3 w-3 inline mr-1" />
                                    {appointment.client_name}
                                  </div>
                                  
                                  <div className="text-xs text-gray-500 mt-auto">
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
                  Para {selectedDate.toLocaleDateString('pt-BR')}
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
                  Total de staff
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
                <div className="text-2xl font-bold">09:00 - 17:00</div>
                <p className="text-xs text-muted-foreground">
                  Segunda a Sexta
                </p>
              </CardContent>
            </Card>
          </div>
                 )}

         {/* Appointment Detail Modal */}
         {showAppointmentModal && selectedAppointment && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
               <div className="p-6">
                 <div className="flex items-center justify-between mb-6">
                   <h2 className="text-2xl font-bold text-gray-900">Detalhes do Agendamento</h2>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={closeAppointmentModal}
                   >
                     <X className="h-5 w-5" />
                   </Button>
                 </div>
                 
                 <div className="space-y-4">
                   {/* Pet Information */}
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-100 rounded-lg">
                       <PawPrint className="h-6 w-6 text-blue-600" />
                     </div>
                     <div>
                       <h3 className="font-semibold text-gray-900">{selectedAppointment.pet_name}</h3>
                       <p className="text-sm text-gray-600">Pet</p>
                     </div>
                   </div>

                   {/* Service Information */}
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-purple-100 rounded-lg">
                       {getServiceIcon(selectedAppointment.service_name)}
                     </div>
                     <div>
                       <h3 className="font-semibold text-gray-900">{selectedAppointment.service_name}</h3>
                       <p className="text-sm text-gray-600">Serviço</p>
                     </div>
                   </div>

                   {/* Client Information */}
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-green-100 rounded-lg">
                       <User className="h-6 w-6 text-green-600" />
                     </div>
                     <div>
                       <h3 className="font-semibold text-gray-900">{selectedAppointment.client_name}</h3>
                       <p className="text-sm text-gray-600">Cliente</p>
                     </div>
                   </div>

                   {/* Staff Information */}
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-orange-100 rounded-lg">
                       <User className="h-6 w-6 text-orange-600" />
                     </div>
                     <div>
                       <h3 className="font-semibold text-gray-900">{selectedAppointment.staff_name}</h3>
                       <p className="text-sm text-gray-600">Staff</p>
                     </div>
                   </div>

                   {/* Time and Date */}
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-gray-100 rounded-lg">
                       <Clock className="h-6 w-6 text-gray-600" />
                     </div>
                     <div>
                       <h3 className="font-semibold text-gray-900">
                         {selectedAppointment.time} - {new Date(`2000-01-01T${selectedAppointment.time}`).getTime() + selectedAppointment.duration * 60000 > new Date(`2000-01-01T${selectedAppointment.time}`).getTime() ? 
                           new Date(new Date(`2000-01-01T${selectedAppointment.time}`).getTime() + selectedAppointment.duration * 60000).toTimeString().slice(0, 5) : 
                           selectedAppointment.time
                         }
                       </h3>
                       <p className="text-sm text-gray-600">
                         {new Date(selectedAppointment.date).toLocaleDateString('pt-BR', { 
                           weekday: 'long', 
                           year: 'numeric', 
                           month: 'long', 
                           day: 'numeric' 
                         })}
                       </p>
                       <p className="text-sm text-gray-500">Duração: {selectedAppointment.duration} minutos</p>
                     </div>
                   </div>

                                       {/* Status */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Calendar className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <Badge 
                          variant="outline" 
                          className={`text-sm ${
                            selectedAppointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            selectedAppointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            selectedAppointment.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                            selectedAppointment.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          {selectedAppointment.status}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">Status</p>
                      </div>
                    </div>

                                         {/* Notes - Always show */}
                     <div className="flex items-start gap-3">
                       <div className="p-2 bg-indigo-100 rounded-lg mt-1">
                         <FileText className="h-6 w-6 text-indigo-600" />
                       </div>
                       <div className="flex-1">
                         <h3 className="font-semibold text-gray-900 mb-2">Observações</h3>
                         <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                           <p className="text-sm text-gray-700 whitespace-pre-wrap">
                             {selectedAppointment.notes || "Sem comentários"}
                           </p>
                         </div>
                       </div>
                     </div>
                 </div>

                 {/* Action Buttons */}
                 <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                   <Button
                     variant="outline"
                     onClick={closeAppointmentModal}
                   >
                     Fechar
                   </Button>
                 </div>
               </div>
             </div>
           </div>
         )}
       </div>
     </AdminLayout>
   );
 };

export default AdminAgendaHoje; 