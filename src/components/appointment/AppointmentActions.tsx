
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

      // Cancel the appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Restore staff availability
      if (appointment.appointment_staff && appointment.appointment_staff.length > 0) {
        const serviceDuration = appointment.services.default_duration || 60;
        const appointmentDate = appointment.date;
        const appointmentTime = appointment.time;

        for (const staff of appointment.appointment_staff) {
          let checkMinutes = 0;
          while (checkMinutes < serviceDuration) {
            const timeSlot = new Date(`1970-01-01T${appointmentTime}`);
            timeSlot.setMinutes(timeSlot.getMinutes() + checkMinutes);
            const timeSlotString = timeSlot.toTimeString().slice(0, 8);

            await supabase
              .from('staff_availability')
              .update({ available: true })
              .eq('staff_profile_id', staff.staff_profile_id)
              .eq('date', appointmentDate)
              .eq('time_slot', timeSlotString);

            checkMinutes += 30;
          }
        }
      }

      toast.success('Agendamento cancelado com sucesso');
      setShowCancelDialog(false);
      if (onCancel) onCancel();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Erro ao cancelar agendamento');
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
