
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AppointmentStatus {
  id: string;
  pet_name: string;
  owner_name: string;
  service: string;
  provider_name: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
}

const StatusCenter = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    // Only allow admin, groomer, and vet roles
    if (!['admin', 'groomer', 'vet'].includes(userRole || '')) {
      toast.error('Acesso negado. Esta página é restrita a profissionais.');
      navigate('/');
      return;
    }

    loadAppointments();
  }, [user, userRole, authLoading, navigate]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      // For now, we'll load from appointments table
      // In the future, we might want a separate appointment_status table
      let query = supabase
        .from('appointments')
        .select(`
          id,
          pet_name,
          owner_name,
          service,
          date,
          time,
          status,
          notes,
          provider_id
        `)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      // If user is groomer or vet, only show their appointments
      if (userRole === 'groomer') {
        const { data: groomerData } = await supabase
          .from('groomers')
          .select('id')
          .eq('user_id', user?.id)
          .single();
        
        if (groomerData) {
          query = query.eq('provider_id', groomerData.id);
        }
      } else if (userRole === 'vet') {
        const { data: vetData } = await supabase
          .from('veterinarians')
          .select('id')
          .eq('user_id', user?.id)
          .single();
        
        if (vetData) {
          query = query.eq('provider_id', vetData.id);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading appointments:', error);
        toast.error('Erro ao carregar agendamentos');
        return;
      }

      // Get provider names
      const appointmentsWithProviders = await Promise.all(
        (data || []).map(async (appointment) => {
          let providerName = 'N/A';
          
          // Try to get groomer name first
          const { data: groomerData } = await supabase
            .from('groomers')
            .select('name')
            .eq('id', appointment.provider_id)
            .single();
          
          if (groomerData) {
            providerName = groomerData.name;
          } else {
            // Try veterinarian
            const { data: vetData } = await supabase
              .from('veterinarians')
              .select('name')
              .eq('id', appointment.provider_id)
              .single();
            
            if (vetData) {
              providerName = vetData.name;
            }
          }

          return {
            ...appointment,
            provider_name: providerName
          };
        })
      );

      setAppointments(appointmentsWithProviders);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      setUpdating(appointmentId);

      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error updating status:', error);
        toast.error('Erro ao atualizar status');
        return;
      }

      toast.success('Status atualizado com sucesso!');
      loadAppointments(); // Reload the data
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in-progress':
        return <PlayCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'in-progress':
        return 'Em Andamento';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Carregando status dos serviços...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Centro de Status de Serviços</h1>
              <p className="text-gray-600 mt-2">
                Acompanhe o progresso de todos os agendamentos
              </p>
            </div>
            <Button onClick={loadAppointments} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Agendamentos em Andamento</CardTitle>
              <CardDescription>
                {userRole === 'admin' 
                  ? 'Todos os agendamentos do sistema'
                  : 'Seus agendamentos atribuídos'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum agendamento encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pet</TableHead>
                      <TableHead>Proprietário</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                          {appointment.pet_name}
                        </TableCell>
                        <TableCell>{appointment.owner_name}</TableCell>
                        <TableCell>{appointment.service}</TableCell>
                        <TableCell>{appointment.provider_name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(appointment.date).toLocaleDateString('pt-BR')}</div>
                            <div className="text-gray-500">{appointment.time}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(appointment.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(appointment.status)}
                              {getStatusLabel(appointment.status)}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={appointment.status}
                            onValueChange={(value) => updateAppointmentStatus(appointment.id, value)}
                            disabled={updating === appointment.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="in-progress">Em Andamento</SelectItem>
                              <SelectItem value="completed">Concluído</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default StatusCenter;
