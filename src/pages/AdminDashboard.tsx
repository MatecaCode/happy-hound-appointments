import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, LogOut, Users, Calendar, PawPrint, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import PendingApprovalsSection from '@/components/admin/PendingApprovalsSection';
import ServiceStatusSection from '@/components/admin/ServiceStatusSection';

const AdminDashboard = () => {
  const { user, signOut, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPets: 0,
    totalAppointments: 0,
    todayBookedServices: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      navigate('/');
      return;
    }

    loadStats();
  }, [user, isAdmin, loading, navigate]);

  const loadStats = async () => {
    try {
      // Get total users (clients)
      const { count: usersCount, error: usersError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');

      if (usersError) {
        console.error('Error fetching users count:', usersError);
      }

      // Get total pets - fix the query
      const { count: petsCount, error: petsError } = await supabase
        .from('pets')
        .select('id', { count: 'exact', head: true });

      if (petsError) {
        console.error('Error fetching pets count:', petsError);
      }

      // Get total appointments
      const { count: appointmentsCount, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      if (appointmentsError) {
        console.error('Error fetching appointments count:', appointmentsError);
      }

      // Get today's booked services
      const today = new Date().toISOString().split('T')[0];
      const { count: todayServicesCount, error: todayServicesError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .in('status', ['pending', 'confirmed']);

      if (todayServicesError) {
        console.error('Error fetching today services count:', todayServicesError);
      }

      setStats({
        totalUsers: usersCount || 0,
        totalPets: petsCount || 0,
        totalAppointments: appointmentsCount || 0,
        todayBookedServices: todayServicesCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Verificando permissões...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
            <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta página.</p>
            <Button onClick={() => navigate('/')}>
              Voltar ao Início
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
              <p className="text-gray-600 mt-2">
                Bem-vindo, Admin: <span className="font-medium">{user?.email}</span>
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {loadingStats ? '...' : stats.totalUsers}
                </p>
                <p className="text-sm text-gray-500">Total registrados</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  Pets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {loadingStats ? '...' : stats.totalPets}
                </p>
                <p className="text-sm text-gray-500">Cadastrados</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">
                  {loadingStats ? '...' : stats.totalAppointments}
                </p>
                <p className="text-sm text-gray-500">Total</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Serviços Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">
                  {loadingStats ? '...' : stats.todayBookedServices}
                </p>
                <p className="text-sm text-gray-500">Agendados</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <PendingApprovalsSection />
            <ServiceStatusSection />
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Gerenciar Disponibilidade
                </CardTitle>
                <CardDescription>
                  Controle completo sobre horários disponíveis por profissional e data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/admin/availability')}
                  className="w-full sm:w-auto"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Gerenciar Horários
                </Button>
                <p className="text-sm text-gray-500 mt-3">
                  Edite horários disponíveis por profissional, data e tipo de serviço
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Agendar para Clientes
                </CardTitle>
                <CardDescription>
                  Crie agendamentos em nome dos clientes via telefone ou presencialmente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/admin/book-for-client')}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Agendamento
                </Button>
                <p className="text-sm text-gray-500 mt-3">
                  Selecione cliente, pet e serviço para criar agendamentos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Centro de Status de Serviços</CardTitle>
                <CardDescription>
                  Monitoramento de todos os agendamentos em andamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/status-center')}
                  className="w-full sm:w-auto"
                >
                  Acessar Centro de Status
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
