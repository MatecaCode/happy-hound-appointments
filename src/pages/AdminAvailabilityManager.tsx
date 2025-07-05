
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, User, Plus } from 'lucide-react';

interface StaffProfile {
  id: string;
  name: string;
  can_bathe: boolean;
  can_groom: boolean;
  can_vet: boolean;
  active: boolean;
}

interface AvailabilitySlot {
  id: string;
  staff_profile_id: string;
  date: string;
  time_slot: string;
  available: boolean;
  staff_name?: string;
}

const AdminAvailabilityManager = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStaffProfiles();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailabilityForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchStaffProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('id, name, can_bathe, can_groom, can_vet, active')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setStaffProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching staff profiles:', error);
      toast.error('Erro ao carregar profissionais');
    }
  };

  const fetchAvailabilityForDate = async (date: Date) => {
    setIsLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('staff_availability')
        .select(`
          id,
          staff_profile_id,
          date,
          time_slot,
          available,
          staff_profiles!inner(name)
        `)
        .eq('date', dateStr)
        .order('time_slot');

      if (error) throw error;

      const slotsWithNames = (data || []).map(slot => ({
        ...slot,
        staff_name: (slot.staff_profiles as any)?.name || 'Unknown'
      }));

      setAvailabilitySlots(slotsWithNames);
    } catch (error: any) {
      console.error('Error fetching availability:', error);
      toast.error('Erro ao carregar disponibilidade');
    } finally {
      setIsLoading(false);
    }
  };

  const getStaffRole = (staff: StaffProfile) => {
    const roles = [];
    if (staff.can_vet) roles.push('Veterinário');
    if (staff.can_groom) roles.push('Tosador');
    if (staff.can_bathe) roles.push('Banhista');
    return roles.join(', ') || 'Indefinido';
  };

  const generateAvailabilityForStaff = async (staffId: string) => {
    setIsLoading(true);
    try {
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      
      // Generate availability slots manually since RPC doesn't exist
      const availabilitySlots = [];
      const currentDate = new Date();
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      for (let d = new Date(currentDate); d <= thirtyDaysLater; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        
        // Skip Sundays
        if (d.getDay() === 0) continue;
        
        // Generate 10-minute slots from 9:00 to 17:00
        for (let hour = 9; hour < 17; hour++) {
          for (let min = 0; min < 60; min += 10) {
            const timeSlot = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
            availabilitySlots.push({
              staff_profile_id: staffId,
              date: dateStr,
              time_slot: timeSlot,
              available: true
            });
          }
        }
      }

      // Insert availability in batches
      const batchSize = 100;
      for (let i = 0; i < availabilitySlots.length; i += batchSize) {
        const batch = availabilitySlots.slice(i, i + batchSize);
        const { error: batchError } = await supabase
          .from('staff_availability')
          .upsert(batch, { onConflict: 'staff_profile_id,date,time_slot' });

        if (batchError) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, batchError);
        }
      }

      toast.success('Disponibilidade gerada com sucesso!');
      if (selectedDate) {
        fetchAvailabilityForDate(selectedDate);
      }
    } catch (error: any) {
      console.error('Error generating availability:', error);
      toast.error('Erro ao gerar disponibilidade');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSlotAvailability = async (slotId: string, currentAvailability: boolean) => {
    try {
      const { error } = await supabase
        .from('staff_availability')
        .update({ available: !currentAvailability })
        .eq('id', slotId);

      if (error) throw error;

      toast.success('Disponibilidade atualizada!');
      if (selectedDate) {
        fetchAvailabilityForDate(selectedDate);
      }
    } catch (error: any) {
      console.error('Error updating availability:', error);
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  const groupedSlots = availabilitySlots.reduce((acc, slot) => {
    if (!acc[slot.staff_profile_id]) {
      acc[slot.staff_profile_id] = [];
    }
    acc[slot.staff_profile_id].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciamento de Disponibilidade</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Selecionar Data
            </CardTitle>
            <CardDescription>
              Escolha uma data para visualizar a disponibilidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Staff Profiles Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profissionais
            </CardTitle>
            <CardDescription>
              {staffProfiles.length} profissional(is) ativo(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {staffProfiles.map((staff) => (
              <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{staff.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getStaffRole(staff)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => generateAvailabilityForStaff(staff.id)}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Gerar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Availability Slots Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Disponibilidade - {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </CardTitle>
            <CardDescription>
              Clique nos horários para alternar disponibilidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : Object.keys(groupedSlots).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma disponibilidade encontrada para esta data.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedSlots).map(([staffId, slots]) => {
                  const staffName = slots[0]?.staff_name || 'Unknown';
                  const availableSlots = slots.filter(s => s.available).length;
                  const totalSlots = slots.length;
                  
                  return (
                    <div key={staffId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{staffName}</h4>
                        <Badge variant="outline">
                          {availableSlots}/{totalSlots} disponível(is)
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {slots.slice(0, 20).map((slot) => (
                          <Button
                            key={slot.id}
                            size="sm"
                            variant={slot.available ? "default" : "secondary"}
                            onClick={() => toggleSlotAvailability(slot.id, slot.available)}
                            className="h-8 text-xs"
                          >
                            {slot.time_slot.substring(0, 5)}
                          </Button>
                        ))}
                      </div>
                      {slots.length > 20 && (
                        <p className="text-xs text-muted-foreground">
                          ... e mais {slots.length - 20} horários
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAvailabilityManager;
