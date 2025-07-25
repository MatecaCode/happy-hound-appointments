import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, TrendingUp, Bath, Scissors, Stethoscope, CalendarDays } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  date?: string;
  time: string;
  pet_name: string;
  service_name: string;
  service_type: string;
  duration: number;
  owner_name: string;
  status: string;
  requires_bath: boolean;
  requires_grooming: boolean;
  requires_vet: boolean;
}

interface DashboardStats {
  totalAppointments: number;
  groomingCount: number;
  bathCount: number;
  vetCount: number;
  totalPets: number;
  hoursBooked: number;
  nextAppointment: Appointment | null;
}

const StaffDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    groomingCount: 0,
    bathCount: 0,
    vetCount: 0,
    totalPets: 0,
    hoursBooked: 0,
    nextAppointment: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  useEffect(() => {
    if (user) {
      loadStaffData();
    }
  }, [user, selectedDate, viewMode]);

  const loadStaffData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get staff profile first
      const { data: profile, error: profileError } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Staff profile not found:', profileError);
        return;
      }

      setStaffProfile(profile);

      // Calculate date range based on view mode
      let startDate: string, endDate: string;
      if (viewMode === 'week') {
        // Use the selected date to determine the week range
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(weekEnd, 'yyyy-MM-dd');
      } else {
        startDate = endDate = format(selectedDate, 'yyyy-MM-dd');
      }

      // Get appointments for the selected date/week range
      console.log(`🔍 Fetching appointments for staff ${profile.id} from ${startDate} to ${endDate}`);
      
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          duration,
          status,
          pets:pet_id(name),
          services:service_id(name, service_type, requires_bath, requires_grooming, requires_vet),
          clients:client_id(name),
          appointment_staff!inner(staff_profile_id)
        `)
        .eq('appointment_staff.staff_profile_id', profile.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
        .order('time');

      if (error) {
        console.error('❌ Error fetching appointments:', error);
        throw error;
      }

      console.log(`📊 Found ${appointmentsData?.length || 0} appointments for staff ${profile.name}`);
      
      const formattedAppointments: Appointment[] = appointmentsData?.map(apt => ({
        id: apt.id,
        time: apt.time,
        date: apt.date,
        pet_name: (apt.pets as any)?.name || 'Pet desconhecido',
        service_name: (apt.services as any)?.name || 'Serviço desconhecido',
        service_type: (apt.services as any)?.service_type || 'unknown',
        duration: apt.duration || 60,
        owner_name: (apt.clients as any)?.name || 'Cliente desconhecido',
        status: apt.status,
        requires_bath: (apt.services as any)?.requires_bath || false,
        requires_grooming: (apt.services as any)?.requires_grooming || false,
        requires_vet: (apt.services as any)?.requires_vet || false,
      })) || [];

      console.log('📋 Formatted appointments:', formattedAppointments);

      setAppointments(formattedAppointments);

      // Calculate stats
      const totalAppointments = formattedAppointments.length;
      const groomingCount = formattedAppointments.filter(apt => apt.requires_grooming).length;
      const bathCount = formattedAppointments.filter(apt => apt.requires_bath).length;
      const vetCount = formattedAppointments.filter(apt => apt.requires_vet).length;
      const totalPets = new Set(formattedAppointments.map(apt => apt.pet_name)).size;
      const hoursBooked = formattedAppointments.reduce((total, apt) => total + apt.duration, 0) / 60;
      
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const currentDate = format(now, 'yyyy-MM-dd');
      const nextAppointment = formattedAppointments.find(apt => 
        (apt.date === currentDate && apt.time > currentTime && apt.status === 'pending') ||
        (apt.date && apt.date > currentDate && apt.status === 'pending')
      ) || null;

      setStats({
        totalAppointments,
        groomingCount,
        bathCount,
        vetCount,
        totalPets,
        hoursBooked,
        nextAppointment,
      });
    } catch (error) {
      console.error('Error loading staff data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const getServiceIcon = (appointment: Appointment) => {
    if (appointment.requires_vet) return <Stethoscope className="h-5 w-5 text-red-500" />;
    if (appointment.requires_grooming) return <Scissors className="h-5 w-5 text-blue-500" />;
    if (appointment.requires_bath) return <Bath className="h-5 w-5 text-cyan-500" />;
    return <User className="h-5 w-5 text-muted-foreground" />;
  };

  const getServiceBadgeVariant = (appointment: Appointment) => {
    if (appointment.requires_vet) return "destructive";
    if (appointment.requires_grooming) return "default";
    if (appointment.requires_bath) return "secondary";
    return "outline";
  };

  const getServiceTypeText = (appointment: Appointment) => {
    if (appointment.requires_vet) return 'Veterinário';
    if (appointment.requires_grooming) return 'Tosa';
    if (appointment.requires_bath) return 'Banho';
    return 'Serviço';
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Dashboard - {staffProfile?.name}</h1>
          
          {/* Date Picker and View Toggle */}
          <div className="flex items-center gap-4 mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <div className="flex rounded-lg border p-1">
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Dia
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              <p className="text-xs text-muted-foreground">agendamentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Banhos</CardTitle>
              <Bath className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bathCount}</div>
              <p className="text-xs text-muted-foreground">banhos hoje</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tosas</CardTitle>
              <Scissors className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.groomingCount}</div>
              <p className="text-xs text-muted-foreground">tosas hoje</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consultas</CardTitle>
              <Stethoscope className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vetCount}</div>
              <p className="text-xs text-muted-foreground">consultas hoje</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hoursBooked.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">reservadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Next Up Card */}
        {stats.nextAppointment && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Próximo Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {getServiceIcon(stats.nextAppointment)}
                <div>
                  <p className="font-semibold">{stats.nextAppointment.time} - {stats.nextAppointment.pet_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.nextAppointment.service_name} • {stats.nextAppointment.owner_name}
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {getServiceTypeText(stats.nextAppointment)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agenda Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {viewMode === 'day' ? `Agenda - ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}` : 'Agenda da Semana'}
            </CardTitle>
            <CardDescription>
              {viewMode === 'day' 
                ? 'Todos os seus atendimentos para o dia selecionado'
                : 'Resumo dos atendimentos da semana'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum atendimento agendado {viewMode === 'day' ? 'para este dia' : 'para esta semana'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {viewMode === 'week' ? (
                  // Week view: Group by day
                  (() => {
                    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
                    const weekDays = eachDayOfInterval({
                      start: weekStart,
                      end: endOfWeek(selectedDate, { weekStartsOn: 1 })
                    });

                    return weekDays.map(day => {
                      const dayString = format(day, 'yyyy-MM-dd');
                      const dayAppointments = appointments.filter(apt => apt.date === dayString);
                      
                      if (dayAppointments.length === 0) return null;
                      
                      return (
                        <div key={dayString} className="border rounded-lg p-4">
                          <h3 className="font-semibold mb-3 text-lg">
                            {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </h3>
                          <div className="space-y-2">
                            {dayAppointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className="flex items-center gap-4 p-3 bg-accent/20 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
                              >
                                <div className="text-sm font-mono font-medium w-12">
                                  {appointment.time}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {getServiceIcon(appointment)}
                                </div>
                                
                                <div className="flex-1">
                                  <div className="font-medium">{appointment.pet_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {appointment.service_name}
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <div className="text-sm font-medium">{appointment.owner_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {appointment.duration}min
                                  </div>
                                </div>
                                
                                <Badge 
                                  variant={getServiceBadgeVariant(appointment)}
                                  className="ml-2"
                                >
                                  {getServiceTypeText(appointment)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }).filter(Boolean);
                  })()
                ) : (
                  // Day view: Simple list
                  appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="text-sm font-mono font-medium w-16">
                        {appointment.time}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getServiceIcon(appointment)}
                        <Badge variant={getServiceBadgeVariant(appointment)}>
                          {getServiceTypeText(appointment)}
                        </Badge>
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{appointment.pet_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.service_name}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium">{appointment.owner_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {appointment.duration}min
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StaffDashboard;