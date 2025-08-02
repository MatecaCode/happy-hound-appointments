import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dog, Clock, CheckCircle, XCircle, Play, AlertCircle, Calendar, User, ArrowLeft, Search, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppointmentActions from '@/components/appointment/AppointmentActions';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  staff_ids?: string[];
  duration?: number;
  total_price?: number;
  extra_fee?: number;
  edit_info?: string;
  client_name?: string;
  client_email?: string;
  booked_by_admin?: boolean;
  is_admin_override?: boolean;
  is_double_booking?: boolean;
}

const AdminAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // Load all appointments from the database with detailed information
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        console.log('🔍 [ADMIN_APPOINTMENTS] Fetching all appointments');
        
                 // Get all appointments with related data including staff and client info
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
             booked_by_admin,
             is_admin_override,
             is_double_booking,
             extra_fee,
             edit_info,
             client_id,
             pets:pet_id (name),
             services:service_id (name),
             clients:client_id (name, email),
             appointment_staff (
               staff_profiles (name)
             )
           `)
           .order('date', { ascending: true });
        
        if (error) {
          console.error('❌ [ADMIN_APPOINTMENTS] Supabase error:', error);
          throw error;
        }
        
        console.log('📊 [ADMIN_APPOINTMENTS] Raw appointments data:', data);
        
        if (data) {
          const formattedData = data.map((apt) => {
            // Get all staff names and IDs from appointment_staff relationship
            const staffData = apt.appointment_staff?.map((as: any) => ({
              name: as.staff_profiles?.name,
              id: as.staff_profile_id
            })).filter((staff: any) => staff.name) || [];
            const staffNames = staffData.map((staff: any) => staff.name);
            const staffIds = staffData.map((staff: any) => staff.id);

            return {
              id: apt.id,
              pet_name: (apt.pets as any)?.name || 'Pet',
              service_name: (apt.services as any)?.name || 'Serviço',
              date: new Date(apt.date + 'T12:00:00'),
              time: apt.time,
              status: apt.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
              service_status: apt.service_status as 'not_started' | 'in_progress' | 'completed' | undefined,
              notes: apt.notes,
              staff_names: staffNames,
              staff_ids: staffIds,
              duration: apt.duration,
              total_price: apt.total_price,
              extra_fee: apt.extra_fee || 0,
              edit_info: apt.edit_info,
              client_name: (apt.clients as any)?.name || 'Cliente',
              client_email: (apt.clients as any)?.email || '',
              booked_by_admin: apt.booked_by_admin || false,
              is_admin_override: apt.is_admin_override || false,
              is_double_booking: apt.is_double_booking || false,
            };
          });
          
          console.log('✅ [ADMIN_APPOINTMENTS] Formatted appointments:', formattedData);
          setAppointments(formattedData);
        }
      } catch (error) {
        console.error('❌ [ADMIN_APPOINTMENTS] Error fetching appointments:', error);
        toast.error('Erro ao carregar agendamentos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  const refreshAppointments = async () => {
    // Re-fetch appointments
    const fetchAppointments = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
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
            booked_by_admin,
            is_admin_override,
            is_double_booking,
            extra_fee,
            edit_info,
            client_id,
            pets:pet_id (name),
            services:service_id (name),
            clients:client_id (name, email),
            appointment_staff (
              staff_profiles (name)
            )
          `)
          .order('date', { ascending: true });
        
        if (error) throw error;
        
                  if (data) {
            const formattedData = data.map((apt) => {
              const staffData = apt.appointment_staff?.map((as: any) => ({
                name: as.staff_profiles?.name,
                id: as.staff_profile_id
              })).filter((staff: any) => staff.name) || [];
              const staffNames = staffData.map((staff: any) => staff.name);
              const staffIds = staffData.map((staff: any) => staff.id);

              return {
                id: apt.id,
                pet_name: (apt.pets as any)?.name || 'Pet',
                service_name: (apt.services as any)?.name || 'Serviço',
                date: new Date(apt.date + 'T12:00:00'),
                time: apt.time,
                status: apt.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
                service_status: apt.service_status as 'not_started' | 'in_progress' | 'completed' | undefined,
                notes: apt.notes,
                staff_names: staffNames,
                staff_ids: staffIds,
                duration: apt.duration,
                total_price: apt.total_price,
                extra_fee: apt.extra_fee || 0,
                edit_info: apt.edit_info,
                client_name: (apt.clients as any)?.name || 'Cliente',
                client_email: (apt.clients as any)?.email || '',
                booked_by_admin: apt.booked_by_admin || false,
                is_admin_override: apt.is_admin_override || false,
                is_double_booking: apt.is_double_booking || false,
              };
            });
          
          setAppointments(formattedData);
        }
      } catch (error) {
        console.error('Error refreshing appointments:', error);
        toast.error('Erro ao atualizar agendamentos');
      } finally {
        setIsLoading(false);
      }
    };

    await fetchAppointments();
  };

  const getStatusBadge = (status: string, serviceStatus?: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Confirmado</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getServiceStatusBadge = (serviceStatus?: string) => {
    switch (serviceStatus) {
      case 'not_started':
        return <Badge variant="secondary" className="text-xs">Não iniciado</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Em andamento</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Concluído</Badge>;
      default:
        return null;
    }
  };

    const AppointmentDetailCard = ({ appointment }: { appointment: AppointmentWithDetails }) => {
    // Determine card background based on status
    const getCardBackground = () => {
      switch (appointment.status) {
        case 'pending':
          return 'bg-yellow-50/30 border-yellow-200';
        case 'confirmed':
          return 'bg-blue-50/30 border-blue-200';
        case 'completed':
          return 'bg-green-50/30 border-green-200';
        case 'cancelled':
          return 'bg-red-50/30 border-red-200';
        default:
          return 'bg-white border-gray-200';
      }
    };

    // Add orange border for admin overrides
    const getOverrideBorder = () => {
      if (appointment.is_admin_override) {
        return 'border-orange-300';
      }
      return '';
    };

    return (
      <div className={`border rounded-xl p-6 flex flex-col shadow-md hover:shadow-lg transition-shadow ${getCardBackground()} ${getOverrideBorder()}`}>
        {/* 1. Pet Name (bold) */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{appointment.pet_name}</h3>
            <p className="text-sm text-gray-500">{appointment.service_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(appointment.status, appointment.service_status)}
            {getServiceStatusBadge(appointment.service_status)}
          </div>
        </div>

        {/* 2. Date and Time */}
        <div className="flex items-center gap-4 text-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">🗓️</span>
            <span>{format(appointment.date, 'dd/MM/yyyy', { locale: ptBR })}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">🕒</span>
            <span>{appointment.time}</span>
          </div>
        </div>

        {/* 3. Client and Professional - on same line */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">👤</span>
            <span className="text-xs font-medium text-gray-700">Cliente:</span>
            <span className="text-sm">{appointment.client_name}</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">👨‍⚕️</span>
            <span className="text-xs font-medium text-gray-700">Profissional:</span>
            <span className="text-sm">{appointment.staff_names?.[0] || 'Não atribuído'}</span>
          </div>
        </div>

        {/* 4. Duration and Price - side by side */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">⏱</span>
            <span className="text-xs font-medium text-gray-700">Duração:</span>
            <span className="text-sm">{appointment.duration || 60} min</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">💰</span>
            <span className="text-xs font-medium text-gray-700">Preço:</span>
            <span className="text-sm font-medium">R$ {(appointment.total_price || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* 5. Observações - Always show */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-500">📝</span>
            <span className="text-xs font-medium text-gray-700">Observações:</span>
          </div>
          <div className="ml-6">
            {appointment.notes ? (
              <p className="text-xs text-gray-600">{appointment.notes}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">Nenhuma observação</p>
            )}
          </div>
        </div>

        {/* 6. Admin Action Badges */}
        {(appointment.booked_by_admin || appointment.is_admin_override || appointment.is_double_booking) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {appointment.booked_by_admin && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                Criado por Admin
              </Badge>
            )}
            {appointment.is_admin_override && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                Override
              </Badge>
            )}
            {appointment.is_double_booking && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                🚨 Duplo Agendamento
              </Badge>
            )}
          </div>
        )}

                  {/* 7. Edit Info */}
          {appointment.edit_info && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-500">✏️</span>
                <span className="text-xs font-medium text-blue-700">Edição</span>
              </div>
              <p className="text-xs text-blue-600 ml-6">{appointment.edit_info}</p>
            </div>
          )}
          
                    {/* 8. Edit History - Show if appointment was edited */}
          {appointment.is_double_booking && (
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-orange-500">🔁</span>
                <span className="text-xs font-medium text-orange-700">Override Aplicado</span>
              </div>
              <p className="text-xs text-orange-600 ml-6">
                Este agendamento foi editado com override - alguns horários já estavam ocupados
              </p>
            </div>
          )}

          {/* 9. Action Buttons - Always at bottom */}
        <div className="flex items-center justify-between pt-4 mt-auto">
          <div className="flex items-center gap-2">
            <AppointmentActions 
              appointmentId={appointment.id} 
              status={appointment.status} 
              onCancel={refreshAppointments}
              onConfirm={refreshAppointments}
              onEdit={refreshAppointments}
              isAdminOverride={appointment.is_admin_override}
              currentDate={appointment.date}
              currentTime={appointment.time}
              currentExtraFee={appointment.total_price}
              currentNotes={appointment.notes}
            />
          </div>
          
          {/* Debug Link */}
          <Link 
            to={`/admin/debug/availability/${appointment.staff_ids?.[0] || 'unknown'}/${format(appointment.date, 'yyyy-MM-dd')}`}
            className="text-xs text-blue-600 hover:text-blue-800 font-mono"
          >
            🛠️ Debug
          </Link>
        </div>
      </div>
    );
  };

  // Filter appointments based on search and filters
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = searchTerm === '' || 
      appointment.pet_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.staff_names?.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && format(appointment.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) ||
      (dateFilter === 'week' && appointment.date >= new Date() && appointment.date <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const pendingAppointments = filteredAppointments.filter(apt => apt.status === 'pending');
  const confirmedAppointments = filteredAppointments.filter(apt => apt.status === 'confirmed');
  const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed');
  const cancelledAppointments = filteredAppointments.filter(apt => apt.status === 'cancelled');

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/admin/dashboard">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciar Agendamentos</h1>
          </div>
          <p className="text-gray-600">
            Visualize, edite e cancele agendamentos do sistema
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por pet, serviço, cliente ou profissional..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="confirmed">Confirmados</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as datas</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

                 {/* Appointments Tabs */}
         <Tabs defaultValue="pending" className="space-y-4">
           <TabsList className="grid w-full grid-cols-5">
             <TabsTrigger value="pending">Pendentes ({pendingAppointments.length})</TabsTrigger>
             <TabsTrigger value="confirmed">Confirmados ({confirmedAppointments.length})</TabsTrigger>
             <TabsTrigger value="completed">Concluídos ({completedAppointments.length})</TabsTrigger>
             <TabsTrigger value="cancelled">Cancelados ({cancelledAppointments.length})</TabsTrigger>
             <TabsTrigger value="all">Todos ({filteredAppointments.length})</TabsTrigger>
           </TabsList>

                     <TabsContent value="pending" className="space-y-4">
             {isLoading ? (
               <div className="flex items-center justify-center py-8">
                 <div className="flex items-center gap-2">
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                   <span>Carregando agendamentos...</span>
                 </div>
               </div>
             ) : pendingAppointments.length === 0 ? (
               <div className="text-center py-8">
                 <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento pendente</h3>
                 <p className="text-gray-600">Não há agendamentos pendentes no momento.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {pendingAppointments.map((appointment) => (
                   <AppointmentDetailCard key={appointment.id} appointment={appointment} />
                 ))}
               </div>
             )}
           </TabsContent>

           <TabsContent value="confirmed" className="space-y-4">
             {isLoading ? (
               <div className="flex items-center justify-center py-8">
                 <div className="flex items-center gap-2">
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                   <span>Carregando agendamentos...</span>
                 </div>
               </div>
             ) : confirmedAppointments.length === 0 ? (
               <div className="text-center py-8">
                 <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento confirmado</h3>
                 <p className="text-gray-600">Não há agendamentos confirmados no momento.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {confirmedAppointments.map((appointment) => (
                   <AppointmentDetailCard key={appointment.id} appointment={appointment} />
                 ))}
               </div>
             )}
           </TabsContent>

           <TabsContent value="completed" className="space-y-4">
             {isLoading ? (
               <div className="flex items-center justify-center py-8">
                 <div className="flex items-center gap-2">
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                   <span>Carregando agendamentos...</span>
                 </div>
               </div>
             ) : completedAppointments.length === 0 ? (
               <div className="text-center py-8">
                 <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento concluído</h3>
                 <p className="text-gray-600">Não há agendamentos concluídos no momento.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {completedAppointments.map((appointment) => (
                   <AppointmentDetailCard key={appointment.id} appointment={appointment} />
                 ))}
               </div>
             )}
           </TabsContent>

           <TabsContent value="cancelled" className="space-y-4">
             {isLoading ? (
               <div className="flex items-center justify-center py-8">
                 <div className="flex items-center gap-2">
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                   <span>Carregando agendamentos...</span>
                 </div>
               </div>
             ) : cancelledAppointments.length === 0 ? (
               <div className="text-center py-8">
                 <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento cancelado</h3>
                 <p className="text-gray-600">Não há agendamentos cancelados no momento.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {cancelledAppointments.map((appointment) => (
                   <AppointmentDetailCard key={appointment.id} appointment={appointment} />
                 ))}
               </div>
             )}
           </TabsContent>

           <TabsContent value="all" className="space-y-4">
             {isLoading ? (
               <div className="flex items-center justify-center py-8">
                 <div className="flex items-center gap-2">
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                   <span>Carregando agendamentos...</span>
                 </div>
               </div>
             ) : filteredAppointments.length === 0 ? (
               <div className="text-center py-8">
                 <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
                 <p className="text-gray-600">Não há agendamentos que correspondam aos filtros aplicados.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {filteredAppointments.map((appointment) => (
                   <AppointmentDetailCard key={appointment.id} appointment={appointment} />
                 ))}
               </div>
             )}
           </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAppointments; 