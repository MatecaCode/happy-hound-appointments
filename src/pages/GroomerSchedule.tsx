
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateBackendTimeSlots } from '@/utils/timeSlotHelpers';

interface AvailabilitySlot {
  id: string;
  time: string;
  available: boolean;
}

const GroomerSchedule = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [staffProfileId, setStaffProfileId] = useState<string | null>(null);

  // Generate 10-minute granular slots for staff management
  const generateStaffSlots = (): AvailabilitySlot[] => {
    const backendSlots = generateBackendTimeSlots();
    return backendSlots.map(slot => ({
      id: slot,
      time: slot.substring(0, 5), // Format as HH:MM
      available: true
    }));
  };

  useEffect(() => {
    if (user) {
      getStaffProfile();
    }
  }, [user]);

  useEffect(() => {
    if (selectedDate && staffProfileId) {
      fetchAvailability();
    }
  }, [selectedDate, staffProfileId]);

  const getStaffProfile = async () => {
    if (!user) return;

    try {
      const { data: staffProfile, error } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching staff profile:', error);
        return;
      }

      setStaffProfileId(staffProfile?.id || null);
    } catch (error) {
      console.error('Error getting staff profile:', error);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedDate || !staffProfileId) return;
    
    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('📅 [GROOMER_SCHEDULE] Fetching 10-min granular availability for:', { dateStr, staffProfileId });
      
      // Query staff_availability table for 10-minute slots
      const { data, error } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('staff_profile_id', staffProfileId)
        .eq('date', dateStr);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching availability:', error);
      }

      if (data && data.length > 0) {
        const slots = generateStaffSlots().map(slot => {
          const dbSlot = data.find(d => d.time_slot === `${slot.time}:00`);
          return {
            ...slot,
            available: dbSlot ? dbSlot.available : true
          };
        });
        setAvailabilitySlots(slots);
        console.log(`📊 [GROOMER_SCHEDULE] Loaded ${slots.length} 10-min slots, ${slots.filter(s => s.available).length} available`);
      } else {
        const defaultSlots = generateStaffSlots();
        setAvailabilitySlots(defaultSlots);
        console.log(`📋 [GROOMER_SCHEDULE] Using default ${defaultSlots.length} 10-min slots`);
      }
    } catch (error: any) {
      console.error('Error fetching availability:', error);
      toast.error('Erro ao carregar disponibilidade');
      setAvailabilitySlots(generateStaffSlots());
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAvailability = async (timeSlot: string) => {
    if (!selectedDate || !staffProfileId) return;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const currentSlot = availabilitySlots.find(slot => slot.time === timeSlot);
    if (!currentSlot) return;

    const newAvailability = !currentSlot.available;
    const fullTimeSlot = `${timeSlot}:00`;

    console.log('🔄 [GROOMER_SCHEDULE] Toggling 10-min slot:', { timeSlot: fullTimeSlot, newAvailability });

    try {
      // Use direct query to insert into the staff_availability table with 10-minute granularity
      const { error } = await supabase
        .from('staff_availability')
        .upsert({
          staff_profile_id: staffProfileId,
          date: dateStr,
          time_slot: fullTimeSlot,
          available: newAvailability
        }, {
          onConflict: 'staff_profile_id,date,time_slot'
        });

      if (error) throw error;

      // Update local state
      setAvailabilitySlots(prev => 
        prev.map(slot => 
          slot.time === timeSlot 
            ? { ...slot, available: newAvailability }
            : slot
        )
      );

      toast.success(`10-min slot ${timeSlot} ${newAvailability ? 'disponibilizado' : 'bloqueado'}`);
    } catch (error: any) {
      console.error('Error updating availability:', error);
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  const isWeekend = selectedDate?.getDay() === 0; // Sunday

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Minha Agenda (10min granular)</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Data</CardTitle>
              <CardDescription>
                Escolha uma data para configurar sua disponibilidade em slots de 10 minutos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date() || date.getDay() === 0}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Disponibilidade 10min para {selectedDate?.toLocaleDateString('pt-BR')}
              </CardTitle>
              <CardDescription>
                {isWeekend ? 'Fechado aos domingos' : 'Configure seus horários em slots de 10 minutos'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando slots de 10 minutos...</p>
              ) : isWeekend ? (
                <p className="text-muted-foreground">Não atendemos aos domingos.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                    {availabilitySlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-2 border rounded text-xs">
                        <Label htmlFor={slot.id} className="font-medium">
                          {slot.time}
                        </Label>
                        <Switch
                          id={slot.id}
                          checked={slot.available}
                          onCheckedChange={() => toggleAvailability(slot.time)}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const allAvailable = availabilitySlots.every(slot => slot.available);
                        availabilitySlots.forEach(slot => {
                          if (slot.available === allAvailable) {
                            toggleAvailability(slot.time);
                          }
                        });
                      }}
                      className="w-full"
                    >
                      {availabilitySlots.every(slot => slot.available) ? 'Desabilitar Todos' : 'Habilitar Todos'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default GroomerSchedule;
