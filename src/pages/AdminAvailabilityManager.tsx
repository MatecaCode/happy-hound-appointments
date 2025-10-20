
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from '@/components/AdminLayout';

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
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

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

  // Timezone helpers — enforce America/Sao_Paulo for date comparisons
  const getSaoPauloDateParts = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date).reduce((acc: Record<string, number>, p) => {
      if (p.type === 'year' || p.type === 'month' || p.type === 'day') {
        acc[p.type] = parseInt(p.value, 10);
      }
      return acc;
    }, {});
    return { year: parts.year, month: parts.month, day: parts.day } as { year: number; month: number; day: number };
  };

  const getTodaySaoPaulo = (): Date => {
    const { year, month, day } = getSaoPauloDateParts(new Date());
    // Use UTC midnight for stability when rendering day-only comparisons
    return new Date(Date.UTC(year, month - 1, day));
  };

  const isBeforeTodaySaoPaulo = (date: Date): boolean => {
    const { year, month, day } = getSaoPauloDateParts(date);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    const today = getTodaySaoPaulo();
    return candidate.getTime() < today.getTime();
  };

  // Compute 30-minute anchor times within business hours for rendering
  const getAnchorTimes = (): string[] => {
    const anchors: string[] = [];
    const startHour = 9; // 09:00 baseline
    const endHour = 17; // up to 17:00; last anchor at 16:30
    for (let hour = startHour; hour < endHour; hour++) {
      anchors.push(`${hour.toString().padStart(2, '0')}:00:00`);
      anchors.push(`${hour.toString().padStart(2, '0')}:30:00`);
    }
    return anchors;
  };

  const getSubslotTimesForAnchor = (anchor: string): string[] => {
    // anchor format HH:MM:SS; cover +00, +10, +20 for :00 and +30, +40, +50 for :30
    const [hStr, mStr] = anchor.split(':');
    const hour = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);
    const baseMinutes = minute === 0 ? [0, 10, 20] : [30, 40, 50];
    return baseMinutes.map((min) => `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`);
  };

  const getDateStr = (): string => format(selectedDate, 'yyyy-MM-dd');

  const toggleAnchorAvailability = async (
    staffId: string,
    anchor: string,
    currentAvailable: boolean
  ) => {
    try {
      const subslots = getSubslotTimesForAnchor(anchor);
      const dateStr = getDateStr();
      const { data, error } = await supabase
        .from('staff_availability')
        .update({ available: !currentAvailable })
        .eq('staff_profile_id', staffId)
        .eq('date', dateStr)
        .in('time_slot', subslots)
        .select('id');

      if (error) throw error;

      const affected = data?.length || 0;
      if (affected > 0) {
        toast.success(`Disponibilidade atualizada (${affected} horários).`);
      } else {
        toast.error('Nenhum horário atualizado para este intervalo.');
      }
      if (selectedDate) {
        fetchAvailabilityForDate(selectedDate);
      }
    } catch (err: any) {
      console.error('[ADMIN_AVAILABILITY] Anchor toggle error', err);
      toast.error('Erro ao atualizar disponibilidade');
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
        
        // Generate 10-minute slots from 9:00 to 17:00 (weekdays) / 12:00 (Saturdays)
        for (let hour = 9; hour <= 17; hour++) {
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
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Disponibilidade</h1>
          <p className="text-gray-600 mt-2">Gerencie a disponibilidade dos profissionais</p>
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
              // Block past dates (America/Sao_Paulo)
              disabled={(date) => isBeforeTodaySaoPaulo(date)}
              // Prevent navigating to months before current SP month
              fromMonth={(() => {
                const t = getTodaySaoPaulo();
                return new Date(t.getUTCFullYear(), t.getUTCMonth(), 1);
              })()}
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
            {/* Staff filter */}
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Profissionais</label>
              <Select
                value={selectedStaffIds[0] || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') setSelectedStaffIds([]);
                  else setSelectedStaffIds([value]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {staffProfiles.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(selectedStaffIds.length === 0 ? staffProfiles : staffProfiles.filter(s => selectedStaffIds.includes(s.id))).map((staff) => (
              <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{staff.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getStaffRole(staff)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                    onClick={async () => {
                      // Whole-day mark available across business hours for selected date
                      const dateStr = format(selectedDate, 'yyyy-MM-dd');
                      const anchors = getAnchorTimes();
                      const subslots = anchors.flatMap(getSubslotTimesForAnchor);
                      const { data, error } = await supabase
                        .from('staff_availability')
                        .update({ available: true })
                        .eq('staff_profile_id', staff.id)
                        .eq('date', dateStr)
                        .in('time_slot', subslots)
                        .select('id');
                      if (error) {
                        console.error('[ADMIN_AVAILABILITY] day-available error', error);
                        toast.error('Erro ao marcar dia disponível');
                      } else {
                        const affected = data?.length || 0;
                        toast.success(`Dia marcado disponível (${affected} horários).`);
                        fetchAvailabilityForDate(selectedDate);
                      }
                    }}
                    disabled={isLoading}
                  >
                    Marcar dia todo Disponível
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-500 hover:bg-red-600"
                    onClick={async () => {
                      const dateStr = format(selectedDate, 'yyyy-MM-dd');
                      const anchors = getAnchorTimes();
                      const subslots = anchors.flatMap(getSubslotTimesForAnchor);
                      const { data, error } = await supabase
                        .from('staff_availability')
                        .update({ available: false })
                        .eq('staff_profile_id', staff.id)
                        .eq('date', dateStr)
                        .in('time_slot', subslots)
                        .select('id');
                      if (error) {
                        console.error('[ADMIN_AVAILABILITY] day-unavailable error', error);
                        toast.error('Erro ao marcar dia indisponível');
                      } else {
                        const affected = data?.length || 0;
                        toast.success(`Dia marcado indisponível (${affected} horários).`);
                        fetchAvailabilityForDate(selectedDate);
                      }
                    }}
                    disabled={isLoading}
                  >
                    Marcar dia todo Indisponível
                  </Button>
                </div>
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
            {/* Legend */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-green-500" />
                <span className="text-xs text-gray-600">Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-red-500" />
                <span className="text-xs text-gray-600">Indisponível</span>
              </div>
            </div>
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
                        {getAnchorTimes().map((anchor) => {
                          const subslots = getSubslotTimesForAnchor(anchor);
                          const subslotStates = subslots.map((t) => slots.find((s) => s.time_slot === t));
                          const allPresent = subslotStates.every(Boolean);
                          const allAvailable = allPresent && subslotStates.every((s) => (s as AvailabilitySlot).available);
                          const anchorLabel = anchor.substring(0, 5);
                          return (
                            <Button
                              key={`${staffId}-${anchor}`}
                              size="sm"
                              className={allAvailable ? "h-8 text-xs bg-green-500 hover:bg-green-600 text-white" : "h-8 text-xs bg-red-500 hover:bg-red-600 text-white"}
                              onClick={() => toggleAnchorAvailability(staffId, anchor, allAvailable)}
                            >
                              {anchorLabel}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAvailabilityManager;
