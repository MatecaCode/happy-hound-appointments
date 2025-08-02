import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarIcon, Edit, DollarSign, FileText, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  status?: string;
  total_price?: number;
}

const AdminEditBooking = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [extraFee, setExtraFee] = useState<string>('0');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  
  // Available time slots
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);

  // Load appointment details
  useEffect(() => {
    const loadAppointmentDetails = async () => {
      if (!appointmentId) {
        setError('ID do agendamento não fornecido');
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 [ADMIN_EDIT_BOOKING] Loading appointment details for:', appointmentId);
        
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            date,
            time,
            extra_fee,
            notes,
            duration,
            status,
            total_price,
            services:service_id (name),
            pets:pet_id (name),
            clients:client_id (name)
          `)
          .eq('id', appointmentId)
          .single();

        if (error) {
          console.error('❌ [ADMIN_EDIT_BOOKING] Error loading appointment:', error);
          throw error;
        }

        if (!data) {
          throw new Error('Agendamento não encontrado');
        }

        console.log('✅ [ADMIN_EDIT_BOOKING] Appointment details loaded:', data);
        
        const details: AppointmentDetails = {
          id: data.id,
          date: data.date,
          time: data.time,
          extra_fee: data.extra_fee || 0,
          notes: data.notes,
          duration: data.duration,
          status: data.status,
          total_price: data.total_price,
          service_name: (data.services as any)?.name,
          pet_name: (data.pets as any)?.name,
          client_name: (data.clients as any)?.name
        };

        setAppointmentDetails(details);
        
        // Pre-populate form fields
        setSelectedDate(new Date(data.date + 'T12:00:00'));
        setSelectedTime(data.time);
        setExtraFee((data.extra_fee || 0).toString());
        setAdminNotes(data.notes || '');
        
      } catch (error: any) {
        console.error('❌ [ADMIN_EDIT_BOOKING] Error:', error);
        setError(error.message || 'Erro ao carregar detalhes do agendamento');
        toast.error('Erro ao carregar detalhes do agendamento');
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointmentDetails();
  }, [appointmentId]);

  // Load available time slots when date changes
  useEffect(() => {
    const loadTimeSlots = async () => {
      if (!selectedDate) return;
      
      setIsLoadingTimeSlots(true);
      try {
        // Generate time slots from 9:00 to 16:00 in 30-minute intervals
        const slots = [];
        for (let hour = 9; hour <= 16; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            if (hour === 16 && minute > 0) break; // Stop at 16:00
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast.error('Por favor, selecione uma data e horário');
      return;
    }

    setIsSaving(true);
    try {
      console.log('🔧 [ADMIN_EDIT_BOOKING] Submitting edit:', {
        appointmentId,
        newDate: selectedDate,
        newTime: selectedTime,
        extraFee: parseFloat(extraFee) || 0,
        adminNotes,
        editReason
      });

      const { error } = await supabase.rpc('edit_booking_admin', {
        _appointment_id: appointmentId!,
        _new_date: format(selectedDate, 'yyyy-MM-dd'),
        _new_time: selectedTime,
        _extra_fee: parseFloat(extraFee) || 0,
        _admin_notes: adminNotes || null,
        _edit_reason: editReason || null,
        _edited_by: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) {
        console.error('❌ [ADMIN_EDIT_BOOKING] Error:', error);
        throw error;
      }

      console.log('✅ [ADMIN_EDIT_BOOKING] Successfully edited booking');
      toast.success('Agendamento editado com sucesso');
      
      // Navigate back to appointments list
      navigate('/admin/appointments');
      
    } catch (error: any) {
      console.error('❌ [ADMIN_EDIT_BOOKING] Error editing booking:', error);
      toast.error(`Erro ao editar agendamento: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => {
    if (!appointmentDetails) return false;
    
    return (
      selectedDate?.getTime() !== new Date(appointmentDetails.date + 'T12:00:00').getTime() ||
      selectedTime !== appointmentDetails.time ||
      parseFloat(extraFee) !== (appointmentDetails.extra_fee || 0) ||
      adminNotes !== (appointmentDetails.notes || '') ||
      editReason !== ''
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Carregando detalhes do agendamento...</span>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !appointmentDetails) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate('/admin/appointments')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Agendamento não encontrado'}
            </AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/admin/appointments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Agendamento</h1>
            <p className="text-gray-600">Modifique os detalhes do agendamento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Appointment Info Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Detalhes do Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Serviço</Label>
                  <p className="text-sm text-gray-900">{appointmentDetails.service_name}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Pet</Label>
                  <p className="text-sm text-gray-900">{appointmentDetails.pet_name}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Cliente</Label>
                  <p className="text-sm text-gray-900">{appointmentDetails.client_name}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Duração</Label>
                  <p className="text-sm text-gray-900">{appointmentDetails.duration} min</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <p className="text-sm text-gray-900 capitalize">{appointmentDetails.status}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Preço Total</Label>
                  <p className="text-sm font-medium text-gray-900">
                    R$ {(appointmentDetails.total_price || 0).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Modificar Agendamento</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
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
                    <Label htmlFor="time">Novo Horário</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingTimeSlots ? (
                          <SelectItem value="" disabled>Carregando...</SelectItem>
                        ) : (
                          availableTimeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate('/admin/appointments')}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSaving || !hasChanges()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEditBooking; 