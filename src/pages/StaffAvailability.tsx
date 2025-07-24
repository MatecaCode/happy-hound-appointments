import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AvailabilityStatus = 'available' | 'unavailable' | 'pending';

interface TimeSlot {
  time: string;
  status: AvailabilityStatus;
}

const StaffAvailability = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffProfile, setStaffProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadStaffProfile();
    }
  }, [user]);

  useEffect(() => {
    if (selectedDate && staffProfile) {
      fetchAvailability();
    }
  }, [selectedDate, staffProfile]);

  const loadStaffProfile = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !profile) {
        toast.error('Perfil de funcionário não encontrado');
        return;
      }

      setStaffProfile(profile);
    } catch (error) {
      console.error('Error loading staff profile:', error);
      toast.error('Erro ao carregar perfil');
    }
  };

  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const fetchAvailability = async () => {
    if (!selectedDate || !staffProfile) return;

    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Get existing availability for the selected date
      const { data: availability, error } = await supabase
        .from('staff_availability')
        .select('time_slot, available')
        .eq('staff_profile_id', staffProfile.id)
        .eq('date', dateStr);

      if (error) throw error;

      // Generate all possible time slots
      const allSlots = generateTimeSlots();
      const availabilityMap = new Map(
        availability?.map(item => [
          format(new Date(`2000-01-01T${item.time_slot}`), 'HH:mm'),
          item.available
        ]) || []
      );

      const formattedSlots: TimeSlot[] = allSlots.map(time => ({
        time,
        status: availabilityMap.has(time) 
          ? (availabilityMap.get(time) ? 'available' : 'unavailable')
          : 'available' // Default to available if not set
      }));

      setTimeSlots(formattedSlots);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Erro ao carregar disponibilidade');
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (timeSlot: string, newStatus: AvailabilityStatus) => {
    if (!selectedDate || !staffProfile) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const isAvailable = newStatus === 'available';

      // Upsert the availability record
      const { error } = await supabase
        .from('staff_availability')
        .upsert({
          staff_profile_id: staffProfile.id,
          date: dateStr,
          time_slot: `${timeSlot}:00`,
          available: isAvailable,
        }, {
          onConflict: 'staff_profile_id,date,time_slot'
        });

      if (error) throw error;

      // Update local state
      setTimeSlots(prevSlots =>
        prevSlots.map(slot =>
          slot.time === timeSlot ? { ...slot, status: newStatus } : slot
        )
      );

      toast.success('Disponibilidade atualizada');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  const getStatusColor = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600';
      case 'unavailable':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusText = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'unavailable':
        return 'Indisponível';
      default:
        return 'Pendente';
    }
  };

  const toggleAvailability = (timeSlot: string, currentStatus: AvailabilityStatus) => {
    const newStatus = currentStatus === 'available' ? 'unavailable' : 'available';
    updateAvailability(timeSlot, newStatus);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gerenciar Disponibilidade</h1>
          <p className="text-muted-foreground">
            Configure seus horários disponíveis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Selecionar Data</CardTitle>
              <CardDescription>
                Escolha o dia para gerenciar sua disponibilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date.getDay() === 0}
                locale={ptBR}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                Horários - {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : ''}
              </CardTitle>
              <CardDescription>
                Clique nos horários para alternar disponibilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-6 gap-2">
                  {[...Array(48)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant="outline"
                      size="sm"
                      className={`h-10 text-xs font-medium text-white border-0 ${getStatusColor(slot.status)}`}
                      onClick={() => toggleAvailability(slot.time, slot.status)}
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="flex gap-4 mt-6 justify-center">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500 text-white">Disponível</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 text-white">Indisponível</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default StaffAvailability;