
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TimeSlotSelector from '@/components/TimeSlotSelector';
import NextAvailableAppointment from '@/components/NextAvailableAppointment';
import { debugProviderAvailability, debugGroomerProviderMapping } from '@/utils/debugBookingFlow';

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
}) => {
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setSelectedTimeSlotId(''); // Reset time slot when date changes
    }
  };

  // 🔥 DEBUG: Add button to trigger debug functions
  const handleDebugClick = async () => {
    console.log('🔥 [DEBUG] Starting comprehensive debug analysis...');
    
    // Debug groomer mapping
    await debugGroomerProviderMapping();
    
    // If we have a selected time slot, debug availability
    if (selectedTimeSlotId && date) {
      const dateStr = date.toISOString().split('T')[0];
      // This will need the actual provider_profile_id - we'll get it from the form state
      console.log('🔥 [DEBUG] Would check availability for:', {
        date: dateStr,
        time_slot: selectedTimeSlotId
      });
    }
  };

  const canProceed = showTimeSlots ? selectedTimeSlotId : date;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {stepTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 🔥 DEBUG BUTTON - Remove in production */}
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleDebugClick}
          className="bg-red-50 border-red-200 text-red-700"
        >
          🔥 DEBUG: Analyze Booking Flow
        </Button>

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

            {showTimeSlots && date && (
              <div className="mt-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Carregando horários...</p>
                  </div>
                ) : (
                  <TimeSlotSelector
                    date={date}
                    timeSlots={timeSlots}
                    selectedTimeSlotId={selectedTimeSlotId}
                    onSelectTimeSlot={setSelectedTimeSlotId}
                  />
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="next-available">
            <NextAvailableAppointment
              nextAvailable={nextAvailable}
              onSelect={handleNextAvailableSelect}
              loading={isLoading}
            />
          </TabsContent>
        </Tabs>

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
