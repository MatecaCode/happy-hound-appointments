import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

// Interfaces
interface StaffProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  can_bathe: boolean;
  can_groom: boolean;
  can_vet: boolean;
  active: boolean;
  bio: string;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

interface StaffAvailability {
  id: string;
  staff_profile_id: string;
  date: string;
  time_slot: string;
  available: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface TimeBlock {
  time: string;
  displayTime: string;
  available: boolean;
  slotIds: string[];
}

const AdminStaffAvailability = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availability, setAvailability] = useState<StaffAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isUpdating, setIsUpdating] = useState(false);

  // Load staff data and availability
  useEffect(() => {
    if (id && user) {
      fetchStaffData();
    }
  }, [id, user]);

  useEffect(() => {
    if (staff) {
      fetchAvailability();
    }
  }, [staff, selectedDate, viewMode]);

  const fetchStaffData = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ [STAFF_AVAILABILITY] Error fetching staff:', error);
        toast.error('Erro ao carregar dados do staff');
        return;
      }

      setStaff(data);
    } catch (error) {
      console.error('❌ [STAFF_AVAILABILITY] Error fetching staff:', error);
      toast.error('Erro ao carregar dados do staff');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailability = async () => {
    if (!staff) return;

    try {
      const startDate = viewMode === 'day' 
        ? selectedDate.format('YYYY-MM-DD')
        : selectedDate.startOf('week').format('YYYY-MM-DD');
      
      const endDate = viewMode === 'day'
        ? selectedDate.format('YYYY-MM-DD')
        : selectedDate.endOf('week').format('YYYY-MM-DD');

      const { data, error } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('staff_profile_id', staff.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
        .order('time_slot');

      if (error) {
        console.error('❌ [STAFF_AVAILABILITY] Error fetching availability:', error);
        toast.error('Erro ao carregar disponibilidade');
        return;
      }

      setAvailability(data || []);
    } catch (error) {
      console.error('❌ [STAFF_AVAILABILITY] Error fetching availability:', error);
      toast.error('Erro ao carregar disponibilidade');
    }
  };

  const handleToggleAvailability = async (slotIds: string[], newAvailable: boolean) => {
    if (!staff) return;

    // Get the date from the first slot to check if it's Sunday
    const firstSlot = availability.find(slot => slot.id === slotIds[0]);
    if (firstSlot) {
      const dateObj = dayjs(firstSlot.date);
      if (dateObj.day() === 0) {
        toast.error('Não é possível alterar disponibilidade aos domingos');
        return;
      }
    }

    console.log('🔧 [STAFF_AVAILABILITY] Attempting to update slots:', {
      slotIds,
      newAvailable,
      staffId: staff.id,
      userId: user?.id
    });

    setIsUpdating(true);
    try {
      // Update all slots in the 30-minute block
      const { error, data } = await supabase
        .from('staff_availability')
        .update({ 
          available: newAvailable,
          updated_at: new Date().toISOString()
        })
        .in('id', slotIds)
        .select();

      console.log('🔧 [STAFF_AVAILABILITY] Update result:', { error, data });

      if (error) {
        console.error('❌ [STAFF_AVAILABILITY] Error updating availability:', error);
        toast.error('Erro ao atualizar disponibilidade');
        return;
      }

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_user_id: user?.id,
          action_type: 'availability_override',
          target_type: 'staff_availability',
          target_id: slotIds[0], // Use first slot as reference
          reason: newAvailable ? 'Admin restored availability' : 'Admin disabled availability',
          old_values: { available: !newAvailable },
          new_values: { available: newAvailable },
          details: `Staff availability override: ${newAvailable ? 'enabled' : 'disabled'} 30-min block`
        });

      toast.success(`Disponibilidade ${newAvailable ? 'habilitada' : 'desabilitada'} com sucesso`);
      
      // Refresh availability data
      await fetchAvailability();
    } catch (error) {
      console.error('❌ [STAFF_AVAILABILITY] Error toggling availability:', error);
      toast.error('Erro ao alterar disponibilidade');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkAction = async (date: string, action: 'enable' | 'disable') => {
    if (!staff) return;

    // Check if the date is Sunday (day 0)
    const dateObj = dayjs(date);
    if (dateObj.day() === 0) {
      toast.error('Não é possível alterar disponibilidade aos domingos');
      return;
    }

    console.log('🔧 [STAFF_AVAILABILITY] Attempting bulk action:', {
      date,
      action,
      staffId: staff.id,
      userId: user?.id
    });

    setIsUpdating(true);
    try {
      // Get all slots for the selected date
      const dateSlots = availability.filter(slot => slot.date === date);
      
      if (dateSlots.length === 0) {
        toast.error('Nenhum slot encontrado para esta data');
        return;
      }

      // Update all slots for the date
      const slotIds = dateSlots.map(slot => slot.id);
      
      console.log('🔧 [STAFF_AVAILABILITY] Bulk update slots:', {
        slotIds,
        action,
        dateSlotsCount: dateSlots.length
      });

      const { error, data } = await supabase
        .from('staff_availability')
        .update({ 
          available: action === 'enable',
          updated_at: new Date().toISOString()
        })
        .in('id', slotIds)
        .select();

      console.log('🔧 [STAFF_AVAILABILITY] Bulk update result:', { error, data });

      if (error) {
        console.error('❌ [STAFF_AVAILABILITY] Error updating availability:', error);
        toast.error('Erro ao atualizar disponibilidade');
        return;
      }

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_user_id: user?.id,
          action_type: 'availability_override',
          target_type: 'staff_availability',
          target_id: dateSlots[0].id,
          reason: action === 'enable' ? 'Admin enabled entire day' : 'Admin disabled entire day',
          old_values: { available: action === 'disable' },
          new_values: { available: action === 'enable' },
          details: `Staff availability bulk override: ${action === 'enable' ? 'enabled' : 'disabled'} entire day`
        });

      toast.success(`Dia ${action === 'enable' ? 'habilitado' : 'desabilitado'} com sucesso`);
      
      // Refresh availability data
      await fetchAvailability();
    } catch (error) {
      console.error('❌ [STAFF_AVAILABILITY] Error bulk action:', error);
      toast.error('Erro ao executar ação em lote');
    } finally {
      setIsUpdating(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setSelectedDate(prev => direction === 'prev' 
        ? prev.subtract(1, 'day')
        : prev.add(1, 'day')
      );
    } else {
      setSelectedDate(prev => direction === 'prev'
        ? prev.subtract(1, 'week')
        : prev.add(1, 'week')
      );
    }
  };

  const getTimeBlocks = (date: string): TimeBlock[] => {
    const dateSlots = availability.filter(slot => slot.date === date);
    
    // Group slots into 30-minute blocks
    const blocks: Record<string, { available: boolean; slotIds: string[] }> = {};
    
    dateSlots.forEach(slot => {
      const time = slot.time_slot.substring(0, 5); // HH:MM
      const hour = parseInt(time.split(':')[0]);
      const minute = parseInt(time.split(':')[1]);
      
      // Round to nearest 30-minute block
      const blockMinute = minute < 30 ? 0 : 30;
      const blockTime = `${hour.toString().padStart(2, '0')}:${blockMinute.toString().padStart(2, '0')}`;
      
      if (!blocks[blockTime]) {
        blocks[blockTime] = { available: true, slotIds: [] };
      }
      
      blocks[blockTime].slotIds.push(slot.id);
      // Block is available only if ALL slots in the block are available
      if (!slot.available) {
        blocks[blockTime].available = false;
      }
    });

    return Object.entries(blocks)
      .map(([time, data]) => ({
        time,
        displayTime: time,
        available: data.available,
        slotIds: data.slotIds
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const getDatesToShow = () => {
    if (viewMode === 'day') {
      return [selectedDate];
    } else {
      const dates = [];
      const startOfWeek = selectedDate.startOf('week');
      for (let i = 0; i < 7; i++) {
        const date = startOfWeek.add(i, 'day');
        // Skip Sundays (day 0)
        if (date.day() !== 0) {
          dates.push(date);
        }
      }
      return dates;
    }
  };

  const formatDate = (date: dayjs.Dayjs) => {
    return date.format('ddd, DD/MM');
  };

  const isToday = (date: dayjs.Dayjs) => {
    return date.isSame(dayjs(), 'day');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!staff) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Staff não encontrado</h3>
            <Button onClick={() => navigate('/admin/settings')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às Configurações
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/settings')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Disponibilidade - {staff.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Gerencie a disponibilidade do profissional
              </p>
            </div>
          </div>

          {/* Staff Info Card */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{staff.name}</h3>
                    <p className="text-sm text-gray-600">{staff.email}</p>
                    <div className="flex gap-2 mt-1">
                      {staff.can_bathe && <Badge variant="secondary">Banhista</Badge>}
                      {staff.can_groom && <Badge variant="secondary">Tosador</Badge>}
                      {staff.can_vet && <Badge variant="secondary">Veterinário</Badge>}
                    </div>
                  </div>
                </div>
                <Badge variant={staff.active ? "default" : "destructive"}>
                  {staff.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Navigation */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Navegação</h2>
                </div>
                
                <Select value={viewMode} onValueChange={(value: 'day' | 'week') => setViewMode(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="text-center min-w-[200px]">
                  <div className="font-medium">
                    {viewMode === 'day' 
                      ? selectedDate.format('DD [de] MMMM [de] YYYY')
                      : `${selectedDate.startOf('week').format('DD/MM')} - ${selectedDate.endOf('week').format('DD/MM/YYYY')}`
                    }
                  </div>
                  <div className="text-sm text-gray-600">
                    {viewMode === 'day' ? 'Visualização diária' : 'Visualização semanal'}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Availability Grid */}
        <div className="space-y-6">
          {getDatesToShow().map((date) => {
            const timeBlocks = getTimeBlocks(date.format('YYYY-MM-DD'));
            const isCurrentDate = isToday(date);
            
            return (
              <Card key={date.format('YYYY-MM-DD')} className={isCurrentDate ? 'ring-2 ring-blue-500' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {formatDate(date)}
                      </h3>
                      {isCurrentDate && (
                        <Badge variant="default">Hoje</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction(date.format('YYYY-MM-DD'), 'enable')}
                        disabled={isUpdating}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Habilitar Dia
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction(date.format('YYYY-MM-DD'), 'disable')}
                        disabled={isUpdating}
                        className="flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Bloquear Dia
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {timeBlocks.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhum horário configurado
                      </h4>
                      <p className="text-gray-600">
                        Não há slots de disponibilidade configurados para esta data
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {timeBlocks.map((block) => (
                        <Button
                          key={block.time}
                          size="sm"
                          variant={block.available ? "default" : "destructive"}
                          className="h-12 text-sm font-medium transition-all duration-200 hover:scale-105"
                          onClick={() => handleToggleAvailability(block.slotIds, !block.available)}
                          disabled={isUpdating}
                        >
                          {block.displayTime}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Legend */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span>Indisponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded ring-2 ring-blue-500"></div>
                <span>Hoje</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminStaffAvailability; 