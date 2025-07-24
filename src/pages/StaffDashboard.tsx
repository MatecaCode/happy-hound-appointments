import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, TrendingUp, Bath, Scissors, Stethoscope } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
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

  useEffect(() => {
    if (user) {
      loadStaffData();
    }
  }, [user]);

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

      const today = new Date().toISOString().split('T')[0];

      // Get today's appointments for this staff member
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          id,
          time,
          duration,
          status,
          pets!inner(name),
          services!inner(name, service_type, requires_bath, requires_grooming, requires_vet),
          clients!inner(name),
          appointment_staff!inner(staff_profile_id)
        `)
        .eq('appointment_staff.staff_profile_id', profile.id)
        .eq('date', today)
        .order('time');

      if (error) throw error;

      const formattedAppointments: Appointment[] = appointmentsData?.map(apt => ({
        id: apt.id,
        time: apt.time,
        pet_name: (apt.pets as any).name,
        service_name: (apt.services as any).name,
        service_type: (apt.services as any).service_type,
        duration: apt.duration || 60,
        owner_name: (apt.clients as any).name,
        status: apt.status,
        requires_bath: (apt.services as any).requires_bath,
        requires_grooming: (apt.services as any).requires_grooming,
        requires_vet: (apt.services as any).requires_vet,
      })) || [];

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
      const nextAppointment = formattedAppointments.find(apt => apt.time > currentTime && apt.status === 'pending') || null;

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
    if (appointment.requires_vet) return <Stethoscope className="h-4 w-4 text-red-500" />;
    if (appointment.requires_grooming) return <Scissors className="h-4 w-4 text-blue-500" />;
    if (appointment.requires_bath) return <Bath className="h-4 w-4 text-cyan-500" />;
    return <User className="h-4 w-4 text-gray-500" />;
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
          <h1 className="text-3xl font-bold mb-2">Dashboard - {staffProfile?.name}</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
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

        {/* Daily Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Agenda de Hoje</CardTitle>
            <CardDescription>
              Todos os seus atendimentos programados para hoje
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum atendimento agendado para hoje</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-mono font-medium w-16">
                      {appointment.time}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getServiceIcon(appointment)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-semibold">{appointment.pet_name}</div>
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
                      variant={appointment.status === 'pending' ? 'default' : 'secondary'}
                      className="ml-4"
                    >
                      {appointment.status === 'pending' ? 'Pendente' : appointment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StaffDashboard;