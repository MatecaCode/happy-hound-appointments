import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarIcon, Edit, DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EditBookingDialogProps {
  appointmentId: string;
  currentDate: Date;
  currentTime: string;
  currentExtraFee?: number;
  currentNotes?: string;
  onEditSuccess: () => void;
  trigger?: React.ReactNode;
}

interface AppointmentDetails {
  id: string;
  date: string;
  time: string;
  extra_fee?: number;
  notes?: string;
  duration?: number;
  service_name?: string;
  pet_name?: string;
  client_name?: string;
}

const EditBookingDialog = ({ 
  appointmentId, 
  currentDate, 
  currentTime, 
  currentExtraFee = 0,
  currentNotes = '',
  onEditSuccess,
  trigger
}: EditBookingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null);
  
     // Form state
   const [selectedDate, setSelectedDate] = useState<Date | undefined>(currentDate);
   const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
   const [extraFee, setExtraFee] = useState<string>(currentExtraFee.toString());
   const [adminNotes, setAdminNotes] = useState<string>('');
   const [editReason, setEditReason] = useState<string>('');
  
  // Available time slots
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<any>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // Load appointment details
  useEffect(() => {
    const loadAppointmentDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            date,
            time,
            extra_fee,
            notes,
            duration,
            services:service_id (name),
            pets:pet_id (name),
            clients:client_id (name)
          `)
          .eq('id', appointmentId)
          .single();

        if (error) throw error;
        
        setAppointmentDetails({
          id: data.id,
          date: data.date,
          time: data.time,
          extra_fee: data.extra_fee || 0,
          notes: data.notes,
          duration: data.duration,
          service_name: (data.services as any)?.name,
          pet_name: (data.pets as any)?.name,
          client_name: (data.clients as any)?.name
        });
      } catch (error) {
        console.error('Error loading appointment details:', error);
        toast.error('Erro ao carregar detalhes do agendamento');
      }
    };

    if (open) {
      loadAppointmentDetails();
    }
  }, [appointmentId, open]);

  // Load available time slots when date changes
  useEffect(() => {
    const loadTimeSlots = async () => {
      if (!selectedDate) return;
      
      setIsLoadingTimeSlots(true);
      try {
        // Generate time slots from 9:00 to 16:30 in 30-minute intervals
        const slots = [];
        for (let hour = 9; hour <= 16; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            // Include 16:30 but not 17:00
            if (hour === 16 && minute > 30) break;
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push(timeString);
          }
        }
        setAvailableTimeSlots(slots);
      } catch (error) {
        console.error('Error loading time slots:', error);
      } finally {
        setIsLoadingTimeSlots(false);
      }
    };

    loadTimeSlots();
  }, [selectedDate]);

  // Check availability when date or time changes
  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedDate || !selectedTime || !appointmentId) {
        setAvailabilityData(null);
        return;
      }

      setIsCheckingAvailability(true);
      try {
        const { data, error } = await supabase.rpc('check_staff_availability_for_edit', {
          _appointment_id: appointmentId,
          _new_date: format(selectedDate, 'yyyy-MM-dd'),
          _new_time: selectedTime
        });

        if (error) {
          console.error('Error checking availability:', error);
          return;
        }

        setAvailabilityData(data);
      } catch (error) {
        console.error('Error checking availability:', error);
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    checkAvailability();
  }, [selectedDate, selectedTime, appointmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast.error('Por favor, selecione uma data');
      return;
    }

    // Time is optional - if not selected, keep the original time
    const timeToUse = selectedTime || currentTime;

    // Validate time format
    if (timeToUse && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeToUse)) {
      toast.error('Formato de horário inválido');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔧 [EDIT_BOOKING] Submitting edit:', {
        appointmentId,
        newDate: selectedDate,
        newTime: timeToUse,
        extraFee: parseFloat(extraFee) || 0,
        adminNotes,
        editReason
      });

      // Check if we have availability data and if there are conflicts
      let hasConflicts = false;
      if (availabilityData && !availabilityData.is_fully_available) {
        hasConflicts = true;
        
        // Show warning about override
        const warningMessage = `⚠️ Atenção: ${availabilityData.unavailable_count} slot(s) já estão ocupados para este horário.\n\n` +
          `Duração do serviço: ${availabilityData.service_duration} min\n` +
          `Horário: ${availabilityData.start_time} - ${availabilityData.end_time}\n\n` +
          `Deseja prosseguir com a edição mesmo assim? (Será criado como override)`;
        
        const confirmed = window.confirm(warningMessage);
        if (!confirmed) {
          setIsLoading(false);
          return;
        }
      }

      // Proceed with edit (force override if conflicts were found)
      const { error } = await supabase.rpc('edit_booking_admin', {
        _appointment_id: appointmentId,
        _new_date: format(selectedDate, 'yyyy-MM-dd'),
        _new_time: timeToUse,
        _extra_fee: parseFloat(extraFee) || 0,
        _admin_notes: adminNotes || null,
        _edit_reason: editReason || null,
        _edited_by: (await supabase.auth.getUser()).data.user?.id,
        _force_override: hasConflicts
      });

      if (error) {
        console.error('❌ [EDIT_BOOKING] Error:', error);
        throw error;
      }

      console.log('✅ [EDIT_BOOKING] Successfully edited booking');
      
      // Show appropriate success message
      if (hasConflicts) {
        toast.success('Agendamento editado com sucesso (override aplicado)', {
          description: 'Alguns horários já estavam ocupados, mas o agendamento foi editado mesmo assim.'
        });
      } else {
        toast.success('Agendamento editado com sucesso');
      }
      
      setOpen(false);
      onEditSuccess();
      
    } catch (error: any) {
      console.error('❌ [EDIT_BOOKING] Error editing booking:', error);
      toast.error(`Erro ao editar agendamento: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = () => {
    const timeToUse = selectedTime || currentTime;
    
    return (
      selectedDate?.getTime() !== currentDate.getTime() ||
      timeToUse !== currentTime ||
      parseFloat(extraFee) !== currentExtraFee ||
      adminNotes !== '' ||
      editReason !== ''
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Agendamento
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Appointment Info */}
          {appointmentDetails && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Detalhes do Agendamento</h4>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Serviço:</span> {appointmentDetails.service_name}</p>
                <p><span className="font-medium">Pet:</span> {appointmentDetails.pet_name}</p>
                <p><span className="font-medium">Cliente:</span> {appointmentDetails.client_name}</p>
                <p><span className="font-medium">Duração:</span> {appointmentDetails.duration} min</p>
              </div>
            </div>
          )}

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">Nova Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    // Disable Sundays and past dates
                    const day = date.getDay();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return day === 0 || date < today;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

                     {/* Time Selection */}
           <div className="space-y-2">
             <Label htmlFor="time">Novo Horário (Opcional)</Label>
             <Select value={selectedTime} onValueChange={setSelectedTime}>
               <SelectTrigger>
                 <SelectValue placeholder="Mantenha o horário atual ou selecione um novo" />
               </SelectTrigger>
               <SelectContent>
                 {isLoadingTimeSlots ? (
                   <SelectItem value="loading" disabled>Carregando...</SelectItem>
                 ) : (
                   availableTimeSlots.map((time) => (
                     <SelectItem key={time} value={time}>
                       {time}
                     </SelectItem>
                   ))
                 )}
               </SelectContent>
             </Select>
             <p className="text-sm text-gray-500">
               Horário atual: {currentTime}
             </p>
             
             {/* Availability Status */}
             {selectedTime && availabilityData && (
               <div className="mt-3 p-3 rounded-lg border">
                 <div className="flex items-center gap-2 mb-2">
                   <span className="text-sm font-medium">Status da Disponibilidade:</span>
                   {isCheckingAvailability ? (
                     <span className="text-sm text-gray-500">Verificando...</span>
                   ) : availabilityData.is_fully_available ? (
                     <span className="text-sm text-green-600 font-medium">✅ Disponível</span>
                   ) : (
                     <span className="text-sm text-red-600 font-medium">❌ Parcialmente Ocupado</span>
                   )}
                 </div>
                 
                 {availabilityData && !isCheckingAvailability && (
                   <div className="text-xs text-gray-600 space-y-1">
                     <p>Duração do serviço: {availabilityData.service_duration} min</p>
                     <p>Horário: {availabilityData.start_time} - {availabilityData.end_time}</p>
                     <p>Slots disponíveis: {availabilityData.available_slots?.length || 0}/{availabilityData.total_slots}</p>
                     
                     {availabilityData.unavailable_count > 0 && (
                       <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                         <p className="text-red-700 font-medium">
                           ⚠️ {availabilityData.unavailable_count} slot(s) já ocupado(s)
                         </p>
                         <p className="text-red-600 text-xs mt-1">
                           O agendamento será criado como override se confirmado.
                         </p>
                       </div>
                     )}
                   </div>
                 )}
               </div>
             )}
           </div>

          {/* Extra Fee */}
          <div className="space-y-2">
            <Label htmlFor="extraFee" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Taxa Extra (R$)
            </Label>
            <Input
              id="extraFee"
              type="number"
              step="0.01"
              min="0"
              value={extraFee}
              onChange={(e) => setExtraFee(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações Administrativas
            </Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Adicione observações sobre a edição..."
              rows={3}
            />
          </div>

          {/* Edit Reason */}
          <div className="space-y-2">
            <Label htmlFor="editReason">Motivo da Edição</Label>
            <Input
              id="editReason"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Ex: Cliente solicitou mudança de horário"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !hasChanges()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBookingDialog; 