import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, ArrowLeft, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStaffAvailability } from '@/hooks/useStaffAvailability';

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface NextAvailable {
  date: string;
  time: string;
  provider_name?: string;
}

interface DateTimeFormProps {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  timeSlots: TimeSlot[];
  selectedTimeSlotId: string | null;
  setSelectedTimeSlotId: (id: string | null) => void;
  nextAvailable: NextAvailable | null;
  handleNextAvailableSelect: () => void;
  isLoading: boolean;
  activeTab: 'calendar' | 'next-available';
  setActiveTab: (tab: 'calendar' | 'next-available') => void;
  notes: string;
  setNotes: (notes: string) => void;
  onBack?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  showTimeSlots?: boolean;
  showSubmitButton?: boolean;
  stepTitle?: string;
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
  onSubmit,
  showTimeSlots = true,
  showSubmitButton = true,
  stepTitle = "Escolha da Data e Horário",
  selectedStaff = [],
  serviceDuration = 60
}) => {
  const canSubmit = date && selectedTimeSlotId && !isLoading;

  // Use staff availability hook to get proper date filtering
  const { isDateDisabled, isLoading: availabilityLoading } = useStaffAvailability({
    selectedStaffIds: selectedStaff,
    serviceDuration: serviceDuration
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 [DateTimeForm] Submitting form...', {
      canSubmit,
      date: !!date,
      selectedTimeSlotId: !!selectedTimeSlotId,
      isLoading
    });
    
    if (canSubmit && onSubmit) {
      console.log('📝 [DateTimeForm] Calling onSubmit...');
      onSubmit(e);
    } else {
      console.log('📝 [DateTimeForm] Cannot submit:', {
        canSubmit,
        hasOnSubmit: !!onSubmit
      });
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    console.log('📅 [DateTimeForm] Date selected:', selectedDate);
    setDate(selectedDate);
    // Clear selected time slot when date changes
    setSelectedTimeSlotId(null);
  };

  // Full screen loading overlay for booking submission with branded animation
  if (isLoading && canSubmit) {
    return (
      <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          {/* Branded Loading Animation */}
          <div className="relative mb-8">
            {/* Main circle background */}
            <div className="w-32 h-32 bg-primary/10 rounded-full animate-pulse"></div>
            
            {/* Rotating border */}
            <div className="absolute inset-0 w-32 h-32 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
            
            {/* Dog face in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-primary/90 rounded-full flex items-center justify-center animate-bounce">
                {/* Dog ears */}
                <div className="absolute -top-3 -left-2 w-4 h-5 bg-primary rounded-full transform -rotate-45"></div>
                <div className="absolute -top-3 -right-2 w-4 h-5 bg-primary rounded-full transform rotate-45"></div>
                
                {/* Dog face */}
                <div className="text-white text-3xl">🐕</div>
              </div>
            </div>
            
            {/* Floating paw prints */}
            <div className="absolute -top-12 -left-12 text-primary/60 animate-pulse text-2xl">🐾</div>
            <div className="absolute -bottom-8 -right-8 text-primary/60 animate-pulse delay-300 text-2xl">🐾</div>
            <div className="absolute -top-6 -right-12 text-primary/60 animate-pulse delay-700 text-2xl">🐾</div>
            <div className="absolute -bottom-12 -left-6 text-primary/60 animate-pulse delay-500 text-2xl">🐾</div>
          </div>

          {/* Loading message */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-primary mb-3">
              Processando seu agendamento...
            </h2>
            <p className="text-muted-foreground text-lg">
              Aguarde enquanto confirmamos sua solicitação
            </p>
            
            {/* Animated dots */}
            <div className="flex justify-center space-x-2 mt-6">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce delay-100"></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{stepTitle}</h2>
        {onBack && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onBack}
            disabled={isLoading}
            className="hover-scale"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'calendar' | 'next-available')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar" disabled={isLoading} className="transition-all duration-200">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Escolher Data
          </TabsTrigger>
          <TabsTrigger value="next-available" disabled={isLoading} className="transition-all duration-200">
            <Clock className="w-4 h-4 mr-2" />
            Próximo Disponível
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4 animate-slide-in-right">
          <div>
            <Label>Selecione uma data</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              locale={ptBR}
              disabled={(date) => {
                // Use the staff availability hook to determine if date should be disabled
                return isDateDisabled(date);
              }}
              className="rounded-md border transition-all duration-200 hover:shadow-md"
            />
            {availabilityLoading && (
              <p className="text-sm text-muted-foreground mt-2 animate-pulse">
                Carregando disponibilidade...
              </p>
            )}
          </div>

          {showTimeSlots && date && (
            <div className="animate-fade-in">
              <Label>Horários disponíveis</Label>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Carregando horários...</span>
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      type="button"
                      variant={selectedTimeSlotId === slot.id ? "default" : "outline"}
                      className="h-auto py-2 transition-all duration-200 hover:scale-105"
                      onClick={() => setSelectedTimeSlotId(slot.id)}
                      disabled={!slot.available || isLoading}
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground mt-2">
                  Nenhum horário disponível para esta data.
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="next-available" className="space-y-4 animate-slide-in-right">
          {nextAvailable ? (
            <div className="p-4 border rounded-lg hover:shadow-md transition-all duration-200">
              <h3 className="font-semibold mb-2">Próximo horário disponível</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {format(new Date(nextAvailable.date), "EEEE, d 'de' MMMM", { locale: ptBR })} às {nextAvailable.time}
              </p>
              {nextAvailable.provider_name && (
                <p className="text-sm text-muted-foreground mb-4">
                  Com: {nextAvailable.provider_name}
                </p>
              )}
              <Button 
                type="button" 
                onClick={handleNextAvailableSelect}
                disabled={isLoading}
                className="hover-scale"
              >
                Selecionar este horário
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Carregando próximos horários disponíveis...
            </p>
          )}
        </TabsContent>
      </Tabs>

      <div className="animate-fade-in">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Alguma informação importante sobre seu pet ou preferências..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-2 transition-all duration-200 focus:shadow-md"
          rows={3}
          disabled={isLoading}
        />
      </div>

      {showSubmitButton && (
        <div className="flex gap-4 animate-fade-in">
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 transition-all duration-200 hover:scale-105"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar Agendamento'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DateTimeForm;
