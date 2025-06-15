
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, LogOut, Users, Calendar, PawPrint, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';

const AdminDashboard = () => {
  const { user, signOut, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPets: 0,
    totalAppointments: 0,
    serviceSlots: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // If not logged in, redirect to login
    if (!user) {
      navigate('/login');
      return;
    }

    // If user is loaded but not an admin (based on user_roles table), show access denied and redirect
    if (!isAdmin) {
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      navigate('/');
      return;
    }

    // If we get here, user is admin - load dashboard statistics
    loadStats();
  }, [user, isAdmin, loading, navigate]);

  const loadStats = async () => {
    try {
      // Approximate "clients" as count of user_roles where role = 'client'
      // Approximate "service_availability" as provider_availability
      const [usersRes, petsRes, appointmentsRes, slotsRes] = await Promise.all([
        supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'client'),
        supabase.from('pets').select('id', { count: 'exact' }),
        supabase.from('appointments').select('id', { count: 'exact' }),
        supabase.from('provider_availability').select('id', { count: 'exact' })
      ]);
      setStats({
        totalUsers: usersRes.count || 0,
        totalPets: petsRes.count || 0,
        totalAppointments: appointmentsRes.count || 0,
        serviceSlots: slotsRes.count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleRefreshAvailability = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-availability', {
        body: {}
      });

      if (error) {
        console.error('Error refreshing availability:', error);
        toast.error('Erro ao atualizar disponibilidade: ' + error.message);
        return;
      }

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error('Erro ao atualizar disponibilidade: ' + data.error);
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('Erro inesperado ao atualizar disponibilidade');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Show loading state while auth is loading
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

  // Show access denied if not admin (after loading is complete, based on user_roles)
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
          {/* Header */}
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

          {/* Statistics Overview */}
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
                  Horários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">
                  {loadingStats ? '...' : stats.serviceSlots}
                </p>
                <p className="text-sm text-gray-500">Disponíveis</p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Actions */}
          <div className="grid gap-6">
            {/* Refresh Availability Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Gerenciar Disponibilidade
                </CardTitle>
                <CardDescription>
                  Atualizar horários disponíveis para todos os profissionais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleRefreshAvailability}
                  disabled={refreshing}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Atualizando...' : '🔁 Refresh Availability'}
                </Button>
                <p className="text-sm text-gray-500 mt-3">
                  Gera horários de 30 minutos das 09:00 às 17:00 para os próximos 7 dias
                </p>
              </CardContent>
            </Card>

            {/* Status Center */}
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
