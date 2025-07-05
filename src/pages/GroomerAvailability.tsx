
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

interface AvailabilitySlot {
  id: string;
  time_slot: string;
  available: boolean;
}

interface StaffProfile {
  id: string;
  name: string;
}

const GroomerAvailability = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load staff profile
  useEffect(() => {
    const loadStaffProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('staff_profiles')
          .select('id, name')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading staff profile:', error);
          if (error.code !== 'PGRST116') { // Not found error
            toast.error('Erro ao carregar perfil do profissional');
          }
          return;
        }

        console.log('Staff profile loaded:', data);
        setStaffProfile(data);
      } catch (error) {
        console.error('Error loading staff profile:', error);
      }
    };

    loadStaffProfile();
  }, [user]);

  // Load availability slots for selected date
  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedDate || !staffProfile) return;

      setIsLoading(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('staff_availability')
          .select('id, time_slot, available')
          .eq('staff_profile_id', staffProfile.id)
          .eq('date', dateStr)
          .order('time_slot');

        if (error) throw error;

        console.log('Availability loaded:', data);
        setAvailabilitySlots(data || []);
      } catch (error) {
        console.error('Error loading availability:', error);
        toast.error('Erro ao carregar disponibilidade');
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailability();
  }, [selectedDate, staffProfile]);

  const toggleAvailability = async (slotId: string, currentAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('staff_availability')
        .update({ available: !currentAvailable })
        .eq('id', slotId);

      if (error) throw error;

      // Update local state
      setAvailabilitySlots(slots =>
        slots.map(slot =>
          slot.id === slotId
            ? { ...slot, available: !currentAvailable }
            : slot
        )
      );

      toast.success('Disponibilidade atualizada');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  const formatTimeSlot = (timeSlot: string) => {
    return timeSlot.substring(0, 5); // Remove seconds
  };

  if (!staffProfile) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-6 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Perfil não encontrado</h2>
              <p>Você precisa ser um profissional cadastrado para acessar esta página.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gerenciar Disponibilidade</h1>
          <p className="text-muted-foreground">
            Olá, {staffProfile.name}! Gerencie sua disponibilidade para agendamentos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Data</CardTitle>
              <CardDescription>
                Escolha a data para gerenciar sua disponibilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                className="rounded-md border w-fit"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Disponibilidade - {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              <CardDescription>
                Clique nos horários para alternar sua disponibilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : availabilitySlots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {availabilitySlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={slot.available ? "default" : "outline"}
                      onClick={() => toggleAvailability(slot.id, slot.available)}
                      className="h-12 flex items-center justify-between"
                    >
                      <span>{formatTimeSlot(slot.time_slot)}</span>
                      <Badge variant={slot.available ? "default" : "secondary"}>
                        {slot.available ? 'Disponível' : 'Indisponível'}
                      </Badge>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhum horário disponível para esta data.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Os horários são gerados automaticamente pelo sistema.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default GroomerAvailability;
