
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, User, Calendar, PawPrint } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingAppointment {
  id: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
  client_id: string;
  pet_id: string;
  service_id: string;
  created_at: string;
  // Related data
  client?: { name: string; };
  pet?: { name: string; };
  service?: { name: string; };
  staff?: { name: string; }[];
}

const PendingApprovalsSection = () => {
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingAppointments = async () => {
    try {
      // Updated query for Phase 1 schema
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          status,
          notes,
          client_id,
          pet_id,
          service_id,
          created_at,
          clients!inner(name),
          pets!inner(name),
          services!inner(name),
          appointment_staff!left(
            staff_profiles!inner(name)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform the data to match our interface
      const transformedAppointments: PendingAppointment[] = appointments?.map(apt => ({
        id: apt.id,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        notes: apt.notes || undefined,
        client_id: apt.client_id,
        pet_id: apt.pet_id,
        service_id: apt.service_id,
        created_at: apt.created_at,
        client: { name: (apt.clients as any)?.name || 'Cliente' },
        pet: { name: (apt.pets as any)?.name || 'Pet' },
        service: { name: (apt.services as any)?.name || 'Serviço' },
        staff: (apt.appointment_staff as any)?.map((as: any) => ({ 
          name: as.staff_profiles?.name || 'Staff' 
        })) || []
      })) || [];

      setPendingAppointments(transformedAppointments);
    } catch (error: any) {
      console.error('Error fetching pending appointments:', error);
      toast.error('Erro ao carregar agendamentos pendentes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (appointmentId: string, newStatus: 'confirmed' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success(
        newStatus === 'confirmed' 
          ? 'Agendamento aprovado!' 
          : 'Agendamento rejeitado!'
      );

      // Refresh the list
      fetchPendingAppointments();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar agendamento');
    }
  };

  useEffect(() => {
    fetchPendingAppointments();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Aprovações Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Aprovações Pendentes
        </CardTitle>
        <CardDescription>
          {pendingAppointments.length} agendamento(s) aguardando aprovação
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum agendamento pendente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingAppointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{appointment.client?.name}</span>
                      <Badge variant="outline">
                        <PawPrint className="h-3 w-3 mr-1" />
                        {appointment.pet?.name}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(appointment.date), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {appointment.time}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <strong>Serviço:</strong> {appointment.service?.name}
                    </div>
                    
                    {appointment.staff && appointment.staff.length > 0 && (
                      <div className="text-sm">
                        <strong>Staff:</strong> {appointment.staff.map(s => s.name).join(', ')}
                      </div>
                    )}
                    
                    {appointment.notes && (
                      <div className="text-sm text-gray-600">
                        <strong>Observações:</strong> {appointment.notes}
                      </div>
                    )}
                  </div>
                  
                  <Badge variant="secondary">Pendente</Badge>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproval(appointment.id, 'rejected')}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApproval(appointment.id, 'confirmed')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingApprovalsSection;
