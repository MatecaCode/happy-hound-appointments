
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, CheckCircle, Dog, User, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConfirmedAppointment {
  id: string;
  date: string;
  time: string;
  notes?: string;
  pet_name: string;
  service_name: string;
  client_name: string;
  staff_names?: string[];
  service_status: 'not_started' | 'in_progress' | 'completed';
}

const ServiceStatusSection = () => {
  const [confirmedAppointments, setConfirmedAppointments] = useState<ConfirmedAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchConfirmedAppointments();
  }, []);

  const fetchConfirmedAppointments = async () => {
    try {
      // Updated query for Phase 1 schema
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          notes,
          service_status,
          client_id,
          pets!inner(name),
          services!inner(name),
          clients!inner(name),
          appointment_staff!left(
            staff_profiles!inner(name)
          )
        `)
        .eq('status', 'confirmed')
        .order('date', { ascending: true });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedAppointments: ConfirmedAppointment[] = appointments?.map(apt => ({
        id: apt.id,
        date: apt.date,
        time: apt.time,
        notes: apt.notes || undefined,
        pet_name: (apt.pets as any)?.name || 'Pet',
        service_name: (apt.services as any)?.name || 'Serviço',
        client_name: (apt.clients as any)?.name || 'Cliente',
        staff_names: (apt.appointment_staff as any)?.map((as: any) => 
          as.staff_profiles?.name || 'Staff'
        ) || [],
        service_status: (apt.service_status || 'not_started') as 'not_started' | 'in_progress' | 'completed'
      })) || [];

      setConfirmedAppointments(transformedAppointments);
    } catch (error: any) {
      console.error('Error fetching confirmed appointments:', error);
      toast.error('Erro ao carregar serviços confirmados');
    } finally {
      setIsLoading(false);
    }
  };

  const updateServiceStatus = async (appointmentId: string, newStatus: string) => {
    setUpdatingIds(prev => new Set(prev).add(appointmentId));
    
    try {
      const { error } = await supabase.rpc('appointment_set_service_status', {
        p_appointment_id: appointmentId,
        p_new_status: newStatus,
        p_note: null
      });

      if (error) throw error;

      // Update local state
      setConfirmedAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, service_status: newStatus as 'not_started' | 'in_progress' | 'completed' }
            : apt
        )
      );

      const statusText = {
        'not_started': 'Não iniciado',
        'in_progress': 'Em andamento',
        'completed': 'Concluído'
      }[newStatus] || newStatus;

      toast.success(`Status atualizado para: ${statusText}`);
      
    } catch (error: any) {
      console.error('Error updating service status:', error);
      toast.error('Erro ao atualizar status do serviço');
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_started':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Não Iniciado
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            <Play className="w-3 h-3 mr-1" />
            Em Andamento
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Acompanhamento de Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4">Carregando serviços...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Acompanhamento de Serviços
        </CardTitle>
        <CardDescription>
          {confirmedAppointments.length} serviço(s) confirmado(s) para acompanhar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {confirmedAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum serviço confirmado para acompanhar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {confirmedAppointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4 bg-blue-50/30">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Dog className="h-4 w-4" />
                      {appointment.pet_name} - {appointment.service_name}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })} às {appointment.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {appointment.client_name}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(appointment.service_status)}
                </div>

                {appointment.staff_names && appointment.staff_names.length > 0 && (
                  <p className="text-sm mb-2">
                    <strong>Profissional:</strong> {appointment.staff_names.join(', ')}
                  </p>
                )}

                {appointment.notes && (
                  <p className="text-sm mb-3 p-2 bg-gray-50 rounded">
                    <strong>Observações:</strong> {appointment.notes}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Select
                    value={appointment.service_status}
                    onValueChange={(value) => updateServiceStatus(appointment.id, value)}
                    disabled={updatingIds.has(appointment.id)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Não Iniciado</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceStatusSection;
