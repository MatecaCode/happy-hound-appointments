
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
      // First get appointment details to restore staff availability
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          service_id,
          services!inner (default_duration),
          appointment_staff!inner (staff_profile_id)
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;

      console.log(`[CANCELLATION] Starting cancellation for appointment ${appointmentId}`);
      console.log(`[CANCELLATION] Appointment details:`, {
        date: appointment.date,
        time: appointment.time,
        duration: appointment.services.default_duration,
        staff: appointment.appointment_staff.map(s => s.staff_profile_id)
      });

      // Restore staff availability using 10-minute increments BEFORE cancelling appointment
      if (appointment.appointment_staff && appointment.appointment_staff.length > 0) {
        const serviceDuration = appointment.services.default_duration || 60;
        const appointmentDate = appointment.date;
        const appointmentTime = appointment.time;

        console.log(`[CANCELLATION] Restoring ${serviceDuration} minutes of availability starting at ${appointmentTime}`);

        // Parse the start time properly to avoid "Invalid time value" errors
        const timeMatch = appointmentTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (!timeMatch) {
          throw new Error(`Invalid time format: ${appointmentTime}`);
        }

        const startHours = parseInt(timeMatch[1], 10);
        const startMinutes = parseInt(timeMatch[2], 10);
        const startSeconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

        console.log(`[CANCELLATION] Parsed start time: ${startHours}:${startMinutes}:${startSeconds}`);

        // Restore availability for each staff member
        for (const staff of appointment.appointment_staff) {
          console.log(`[CANCELLATION] Restoring availability for staff ${staff.staff_profile_id}`);
          
          let checkMinutes = 0;
          const slotsToRestore = [];
          
          // Calculate all slots that need to be restored
          while (checkMinutes < serviceDuration) {
            const slotHours = startHours;
            const slotMinutes = startMinutes + checkMinutes;
            const totalMinutes = slotHours * 60 + slotMinutes;
            const finalHours = Math.floor(totalMinutes / 60);
            const finalMinutes = totalMinutes % 60;
            
            // Format as HH:MM:SS
            const timeSlotString = `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}:00`;
            slotsToRestore.push(timeSlotString);
            
            checkMinutes += 10;
          }

          console.log(`[CANCELLATION] Slots to restore for staff ${staff.staff_profile_id}:`, slotsToRestore);

          // Restore each slot
          for (const timeSlot of slotsToRestore) {
            const { error: restoreError } = await supabase
              .from('staff_availability')
              .update({ 
                available: true,
                updated_at: new Date().toISOString()
              })
              .eq('staff_profile_id', staff.staff_profile_id)
              .eq('date', appointmentDate)
              .eq('time_slot', timeSlot);

            if (restoreError) {
              console.error(`[CANCELLATION] Error restoring slot ${timeSlot}:`, restoreError);
              // Continue with other slots even if one fails
            } else {
              console.log(`[CANCELLATION] Successfully restored slot ${timeSlot} for staff ${staff.staff_profile_id}`);
            }
          }
        }
      }

      // Cancel the appointment after successfully restoring availability
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Log the cancellation event
      const { error: eventError } = await supabase
        .from('appointment_events')
        .insert({
          appointment_id: appointmentId,
          event_type: 'cancelled',
          notes: 'Appointment cancelled by client',
          created_by: null // Will be handled by RLS if needed
        });

      if (eventError) {
        console.warn(`[CANCELLATION] Could not log cancellation event:`, eventError);
        // Don't fail the entire operation for logging issues
      }

      console.log(`[CANCELLATION] Successfully cancelled appointment ${appointmentId}`);
      toast.success('Agendamento cancelado com sucesso');
      setShowCancelDialog(false);
      if (onCancel) onCancel();
    } catch (error) {
      console.error('[CANCELLATION] Error cancelling appointment:', error);
      toast.error(`Erro ao cancelar agendamento: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show cancel button for pending appointments - confirmed appointments cannot be cancelled
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
