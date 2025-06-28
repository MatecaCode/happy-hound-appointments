import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Clock, Sparkles, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TimeSlotSelector from '@/components/TimeSlotSelector';
import NextAvailableAppointment from '@/components/NextAvailableAppointment';

interface DateTimeFormProps {
  date: Date;
  setDate: (date: Date) => void;
  timeSlots: Array<{ id: string; time: string; available: boolean }>;
  selectedTimeSlotId: string;
  setSelectedTimeSlotId: (id: string) => void;
  nextAvailable: { date: string; time: string; provider_name: string } | null;
  handleNextAvailableSelect: () => void;
  isLoading: boolean;
  activeTab: 'calendar' | 'next-available';
  setActiveTab: (tab: 'calendar' | 'next-available') => void;
  notes: string;
  setNotes: (notes: string) => void;
  onBack: () => void;
  onNext?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  showTimeSlots: boolean;
  showSubmitButton: boolean;
  stepTitle: string;
  isShowerOnlyService?: boolean;
}

const DateTimeForm: React.FC<DateTimeFormProps> = ({
  date,
  setDate,
  timeSlots,
  selectedTimeSlotId,
  setSelectedTimeSlotId,
  nextAvailable,
  handleNextAvailableSelect,
  isLoading,
  activeTab,
  setActiveTab,
  notes,
  setNotes,
  onBack,
  onNext,
  onSubmit,
  showTimeSlots,
  showSubmitButton,
  stepTitle,
  isShowerOnlyService = false,
}) => {
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setSelectedTimeSlotId(''); // Reset time slot when date changes
    }
  };

  // 🔒 CRITICAL: Validate selected slot is in available slots
  const isSelectedSlotValid = React.useMemo(() => {
    if (!selectedTimeSlotId) return false;
    const validSlot = timeSlots.find(slot => 
      slot.id === selectedTimeSlotId && slot.available
    );
    return Boolean(validSlot);
  }, [selectedTimeSlotId, timeSlots]);

  const canProceed = showTimeSlots ? isSelectedSlotValid : date; // Use slot validation instead of just ID

  // Debug logging for time slots 
  React.useEffect(() => {
    if (showTimeSlots) {
      console.log('🔍 [DateTimeForm] Time slots data with validation:', {
        timeSlots,
        timeSlots_count: timeSlots.length,
        available_count: timeSlots.filter(s => s.available).length,
        isLoading,
        date: date?.toISOString(),
        showTimeSlots,
        selected_slot: selectedTimeSlotId,
        is_selected_valid: isSelectedSlotValid,
        can_proceed: canProceed
      });
    }
  }, [timeSlots, isLoading, showTimeSlots, date, selectedTimeSlotId, isSelectedSlotValid, canProceed]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {stepTitle}
          {isShowerOnlyService && (
            <span className="text-sm text-blue-600 font-normal">
              (Serviço apenas banho)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Show calendar and tabs only when NOT showing time slots (i.e., step 2) */}
        {!showTimeSlots && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'calendar' | 'next-available')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calendar">Escolher Data</TabsTrigger>
              <TabsTrigger value="next-available">Próximo Disponível</TabsTrigger>
            </TabsList>
            
            <TabsContent value="calendar" className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  disabled={(date) => date < new Date() || date.getDay() === 0}
                  className="rounded-md border"
                />
                
                {date && (
                  <p className="text-sm text-muted-foreground">
                    Data selecionada: {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="next-available">
              <NextAvailableAppointment
                nextAvailable={nextAvailable}
                onSelect={handleNextAvailableSelect}
                loading={isLoading}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Show time slots section for final step (step 4) */}
        {showTimeSlots && (
          <div className="space-y-4">
            {/* Show selected date info */}
            {date && (
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Data selecionada:</p>
                <p className="font-medium">
                  {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            )}

            {/* 🔒 CRITICAL: Show slot validation warning */}
            {selectedTimeSlotId && !isSelectedSlotValid && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium">
                  ⚠️ Horário selecionado não está mais disponível
                </p>
                <p className="text-red-600 text-sm">
                  Por favor, selecione outro horário da lista atualizada.
                </p>
              </div>
            )}

            {/* Time slots or loading */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">
                  {isShowerOnlyService ? 'Carregando horários de banho...' : 'Carregando horários...'}
                </p>
              </div>
            ) : timeSlots.length > 0 ? (
              <TimeSlotSelector
                date={date}
                timeSlots={timeSlots}
                selectedTimeSlotId={selectedTimeSlotId}
                onSelectTimeSlot={setSelectedTimeSlotId}
              />
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Não há horários disponíveis para esta data
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Tente selecionar uma data diferente ou use "Próximo Disponível"
                </p>
              </div>
            )}

            {/* Next available option when no slots */}
            {!isLoading && timeSlots.length === 0 && nextAvailable && (
              <div className="mt-4">
                <NextAvailableAppointment
                  nextAvailable={nextAvailable}
                  onSelect={handleNextAvailableSelect}
                  loading={false}
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Alguma observação especial sobre o atendimento..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={onBack}>
            Voltar
          </Button>
          
          {showSubmitButton ? (
            <Button 
              type="submit" 
              onClick={onSubmit}
              disabled={!canProceed || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : !isSelectedSlotValid && selectedTimeSlotId ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Horário Indisponível
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Confirmar Agendamento
                </>
              )}
            </Button>
          ) : (
            <Button 
              type="button" 
              onClick={onNext}
              disabled={!canProceed || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Carregando...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Continuar
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DateTimeForm;
