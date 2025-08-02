import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  PawPrint, 
  Calendar, 
  Clock, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';

interface DashboardStats {
  totalUsers: number;
  totalPets: number;
  totalBookings: number;
  todayServices: number;
  pendingApprovals: number;
  serviceFollowUps: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPets: 0,
    totalBookings: 0,
    todayServices: 0,
    pendingApprovals: 0,
    serviceFollowUps: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch total users
      const { count: usersCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true });

      // Fetch total pets (assuming pets table exists)
      const { count: petsCount } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true });

      // Fetch total appointments
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      // Fetch today's services
      const today = new Date().toISOString().split('T')[0];
      const { count: todayServicesCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      // Fetch pending approvals (placeholder)
      const pendingApprovalsCount = 0; // TODO: Implement when approval system is added

      // Fetch service follow-ups (placeholder)
      const serviceFollowUpsCount = 0; // TODO: Implement when follow-up system is added

      setStats({
        totalUsers: usersCount || 0,
        totalPets: petsCount || 0,
        totalBookings: appointmentsCount || 0,
        todayServices: todayServicesCount || 0,
        pendingApprovals: pendingApprovalsCount,
        serviceFollowUps: serviceFollowUpsCount,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Erro ao carregar estatísticas do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
          <p className="text-gray-600 mt-2">Visão geral do sistema e KPIs principais</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link to="/admin/actions">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  Centro de Ações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Agendamentos manuais, modificações e cobranças extras
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  Configurações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Staff, serviços, preços e horários de funcionamento
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/logs">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5" />
                  Logs de Ações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Histórico de ações administrativas
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Clientes, staff e administradores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pets</CardTitle>
              <PawPrint className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalPets}</div>
              <p className="text-xs text-muted-foreground">
                Pets cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          <Link to="/admin/appointments">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? '...' : stats.totalBookings}</div>
                <p className="text-xs text-muted-foreground">
                  Todos os agendamentos realizados
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços Hoje</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.todayServices}</div>
              <p className="text-xs text-muted-foreground">
                Agendamentos para hoje
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts and Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Aprovações Pendentes
              </CardTitle>
              <CardDescription>
                Itens que requerem atenção administrativa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.pendingApprovals > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Agendamentos pendentes</span>
                    <Badge variant="destructive">{stats.pendingApprovals}</Badge>
                  </div>
                  <Button size="sm" variant="outline">
                    Ver Detalhes
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Nenhuma aprovação pendente</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Follow-ups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Acompanhamentos de Serviços
              </CardTitle>
              <CardDescription>
                Serviços que requerem follow-up
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.serviceFollowUps > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Follow-ups necessários</span>
                    <Badge variant="secondary">{stats.serviceFollowUps}</Badge>
                  </div>
                  <Button size="sm" variant="outline">
                    Ver Detalhes
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Nenhum follow-up necessário</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
