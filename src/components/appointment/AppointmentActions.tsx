
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface AppointmentActionsProps {
  appointmentId: string;
  status: string;
  onCancel?: () => void;
}

const AppointmentActions = ({ appointmentId, status, onCancel }: AppointmentActionsProps) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancelAppointment = async () => {
    setIsLoading(true);
    try {
      console.log(`[CANCELLATION] Starting atomic cancellation for appointment ${appointmentId}`);
      
      // First get complete appointment details including all staff assignments
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          service_id,
          status,
          duration,
          services!inner (
            name,
            default_duration
          ),
          appointment_staff (
            staff_profile_id,
            staff_profiles (
              name
            )
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        console.error(`[CANCELLATION] Failed to fetch appointment details:`, fetchError);
        throw new Error(`Failed to fetch appointment: ${fetchError.message}`);
      }

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      console.log(`[CANCELLATION] Appointment details:`, {
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        service: (appointment.services as any)?.name,
        stored_duration: appointment.duration,
        service_default_duration: (appointment.services as any)?.default_duration,
        actual_duration_used: appointment.duration || (appointment.services as any)?.default_duration || 60,
        staffCount: appointment.appointment_staff.length,
        currentStatus: appointment.status
      });

      // Validate appointment can be cancelled
      if (appointment.status === 'cancelled') {
        toast.error('Este agendamento já foi cancelado');
        return;
      }

      if (appointment.status !== 'pending') {
        toast.error('Apenas agendamentos pendentes podem ser cancelados');
        return;
      }

      const serviceDuration = appointment.duration || (appointment.services as any)?.default_duration || 60;
      const appointmentDate = appointment.date;
      const appointmentTime = appointment.time;

      // Parse start time safely
      const timeMatch = appointmentTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!timeMatch) {
        throw new Error(`Invalid time format: ${appointmentTime}`);
      }

      const startHours = parseInt(timeMatch[1], 10);
      const startMinutes = parseInt(timeMatch[2], 10);
      console.log(`[CANCELLATION] Parsed start time: ${startHours}:${startMinutes}`);

      // Calculate all 10-minute slots that need to be reverted
      const slotsToRevert: string[] = [];
      let checkMinutes = 0;
      
      while (checkMinutes < serviceDuration) {
        const totalMinutes = startHours * 60 + startMinutes + checkMinutes;
        const slotHours = Math.floor(totalMinutes / 60);
        const slotMinutes = totalMinutes % 60;
        
        const timeSlotString = `${slotHours.toString().padStart(2, '0')}:${slotMinutes.toString().padStart(2, '0')}:00`;
        slotsToRevert.push(timeSlotString);
        checkMinutes += 10; // 10-minute increments
      }

      console.log(`[CANCELLATION] Calculated ${slotsToRevert.length} slots to revert:`, slotsToRevert);

      // Log cancellation attempt
      await supabase.rpc('log_cancellation_debug', {
        p_appointment_id: appointmentId,
        p_message: `Starting cancellation: ${slotsToRevert.length} slots for ${appointment.appointment_staff.length} staff`,
        p_data: {
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          service_duration: serviceDuration,
          slots_to_revert: slotsToRevert,
          staff_assignments: appointment.appointment_staff.map(s => ({
            staff_id: s.staff_profile_id,
            staff_name: (s.staff_profiles as any)?.name
          }))
        }
      });

      // Execute atomic cancellation with full slot reversion
      await supabase.rpc('atomic_cancel_appointment', {
        p_appointment_id: appointmentId,
        p_appointment_date: appointmentDate,
        p_slots_to_revert: slotsToRevert,
        p_staff_ids: appointment.appointment_staff.map(s => s.staff_profile_id)
      });

      console.log(`[CANCELLATION] Successfully completed atomic cancellation for appointment ${appointmentId}`);
      
      toast.success('Agendamento cancelado com sucesso');
      setShowCancelDialog(false);
      if (onCancel) onCancel();

    } catch (error: any) {
      console.error('[CANCELLATION] Error during cancellation:', error);
      
      // Log the error for debugging
      try {
        await supabase.rpc('log_cancellation_debug', {
          p_appointment_id: appointmentId,
          p_message: `Cancellation failed: ${error.message}`,
          p_data: { error: error.message, stack: error.stack }
        });
      } catch (logError) {
        console.error('[CANCELLATION] Failed to log error:', logError);
      }
      
      toast.error(`Erro ao cancelar agendamento: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show cancel button for pending appointments
  if (status !== 'pending') {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCancelDialog(true)}
        className="text-red-600 border-red-200 hover:bg-red-50"
      >
        <X className="h-4 w-4 mr-1" />
        Cancelar
      </Button>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
              Os profissionais selecionados ficarão disponíveis e você pode não conseguir reagendar no mesmo horário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter Agendamento</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Cancelando...' : 'Sim, Cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppointmentActions;
