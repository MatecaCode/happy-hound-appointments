
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
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

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
