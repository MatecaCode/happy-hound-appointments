
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { TimeSlot } from '@/hooks/useAppointmentForm';
import NextAvailableAppointment from '@/components/NextAvailableAppointment';
import { useStaffAvailability } from '@/hooks/useStaffAvailability';
import { ptBR } from 'date-fns/locale';

interface DateTimeFormProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  timeSlots: TimeSlot[];
  selectedTimeSlotId: string;
  setSelectedTimeSlotId: (id: string) => void;
  nextAvailable: { date: string; time: string; provider_name: string; } | null;
  handleNextAvailableSelect: () => void;
  isLoading: boolean;
  activeTab: 'calendar' | 'next-available';
  setActiveTab: (tab: 'calendar' | 'next-available') => void;
  notes: string;
  setNotes: (notes: string) => void;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  showTimeSlots: boolean;
  showSubmitButton: boolean;
  stepTitle: string;
  selectedStaff?: string[];
  serviceDuration?: number;
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
  selectedStaff = [],
  serviceDuration = 60
}) => {
  const { isDateDisabled, isLoading: availabilityLoading, checkDateAvailability } = useStaffAvailability({
    selectedStaffIds: selectedStaff,
    serviceDuration
  });

  const isNextEnabled = !showTimeSlots || (date && selectedTimeSlotId);
  const isSubmitEnabled = showSubmitButton && date && selectedTimeSlotId;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit && isSubmitEnabled) {
      onSubmit(e);
    } else if (onNext && isNextEnabled) {
      onNext();
    }
  };

  // Check if selected date has availability
  const [dateHasAvailability, setDateHasAvailability] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (date && selectedStaff.length > 0) {
      checkDateAvailability(date).then(setDateHasAvailability);
    } else {
      setDateHasAvailability(null);
    }
  }, [date, selectedStaff, checkDateAvailability]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{stepTitle}</CardTitle>
        <CardDescription>
          {showTimeSlots ? 'Escolha a data e horário para seu agendamento' : 'Escolha a data para seu agendamento'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as 'calendar' | 'next-available')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calendar">Escolher Data</TabsTrigger>
              <TabsTrigger value="next-available">Próximo Disponível</TabsTrigger>
            </TabsList>
            
            <TabsContent value="calendar" className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione uma data</Label>
                {availabilityLoading && (
                  <p className="text-sm text-muted-foreground">
                    Verificando disponibilidade dos profissionais selecionados...
                  </p>
                )}
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  disabled={isDateDisabled}
                  className="rounded-md border"
                />
              </div>

              {showTimeSlots && date && (
                <div className="space-y-2">
                  <Label>Horários disponíveis</Label>
                  {isLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : dateHasAvailability === false ? (
                    <div className="text-center py-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-yellow-800 mb-2">
                          Nenhum horário disponível
                        </h3>
                        <p className="text-yellow-600 mb-2">
                          Os profissionais selecionados não têm disponibilidade nesta data.
                        </p>
                        <p className="text-sm text-yellow-500">
                          Tente selecionar outra data ou volte para escolher outros profissionais.
                        </p>
                      </div>
                    </div>
                  ) : timeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot.id}
                          type="button"
                          variant={selectedTimeSlotId === slot.id ? "default" : "outline"}
                          onClick={() => setSelectedTimeSlotId(slot.id)}
                          disabled={!slot.available}
                          className="h-10"
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Nenhum horário disponível para esta data com os profissionais selecionados.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tente selecionar outra data ou volte para escolher outros profissionais.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="next-available">
              <NextAvailableAppointment
                nextAvailable={nextAvailable}
                onSelect={handleNextAvailableSelect}
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Alguma informação importante sobre seu pet ou preferências..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                Voltar
              </Button>
            )}
            
            {showSubmitButton ? (
              <Button type="submit" disabled={!isSubmitEnabled || availabilityLoading} className="flex-1">
                Confirmar Agendamento
              </Button>
            ) : (
              <Button type="submit" disabled={!isNextEnabled || availabilityLoading} className="flex-1">
                Continuar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DateTimeForm;
