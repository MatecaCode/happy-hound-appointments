import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

import { supabase } from '@/integrations/supabase/client';

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
  pet_name: string;
  service: string;
  owner_name: string;
}

const StatusCenter: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Join appointments ←→ pets, services, clients for display names
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          status,
          notes,
          pet:pet_id (
            name
          ),
          service:service_id (
            name
          ),
          client:user_id (
            name
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      // Map: flatten structure for easier display
      const enhanced = (data || []).map((row: any) => ({
        ...row,
        pet_name: row.pet?.name || '-',
        service: row.service?.name || '-',
        owner_name: row.client?.name || '-',
      }));

      setAppointments(enhanced);
    } catch (err: any) {
      setError('Erro ao carregar dados dos agendamentos');
    } finally {
      setIsLoading(false);
    }
  };
  fetchData();
}, []);

  return (
    <Layout>
      <section className="bg-secondary/50 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-semibold text-center">Central de Status</h1>
          <p className="text-muted-foreground text-center">
            Acompanhe os agendamentos e o status dos serviços.
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4">
          {error && (
            <div className="rounded-md bg-red-100 p-4 text-red-700 mb-4">
              <p>{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center">Carregando agendamentos...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="bg-white rounded-lg shadow-md p-4">
                  <h2 className="text-lg font-semibold">{appointment.pet_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {appointment.service} - {appointment.owner_name}
                  </p>
                  <p className="text-sm">
                    Data: {new Date(appointment.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm">Horário: {appointment.time}</p>
                  {appointment.notes && (
                    <p className="text-sm mt-2">
                      <strong>Notas:</strong> {appointment.notes}
                    </p>
                  )}
                  <div className="mt-2">
                    <Badge
                      variant={
                        appointment.status === 'completed'
                          ? 'default'
                          : appointment.status === 'cancelled'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {appointment.status === 'upcoming'
                        ? 'Agendado'
                        : appointment.status === 'completed'
                        ? 'Concluído'
                        : 'Cancelado'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default StatusCenter;
