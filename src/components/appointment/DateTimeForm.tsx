
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
import { BrandedLoading } from '@/components/ui/branded-loading';

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

  // CRITICAL: Deduplicate staff IDs at the very start for availability hook
  const uniqueSelectedStaff = React.useMemo(() => {
    const unique = [...new Set(selectedStaff)];
    console.log('🎯 [UI_DATETIME_FORM] Staff deduplication:', {
      original: selectedStaff,
      unique,
      deduplicationApplied: selectedStaff.length !== unique.length
    });
    return unique;
  }, [selectedStaff]);
  
  const { isDateDisabled, isLoading: availabilityLoading } = useStaffAvailability({
    selectedStaffIds: uniqueSelectedStaff,
    serviceDuration: serviceDuration
  });

  // Enhanced debugging for multi-staff support with deduplication
  React.useEffect(() => {
    console.log('\n🎯 [UI_DEBUG] ===== DateTimeForm timeSlots prop changed =====');
    console.log('🎯 [UI_DEBUG] DateTimeForm received timeSlots:', {
      totalSlots: timeSlots.length,
      availableSlots: timeSlots.filter(s => s.available).length,
      slots: timeSlots.map(s => ({ id: s.id, time: s.time, available: s.available })),
      selectedDate: date,
      selectedTime: selectedTimeSlotId,
      originalSelectedStaff: selectedStaff,
      uniqueSelectedStaff,
      originalStaffCount: selectedStaff.length,
      uniqueStaffCount: uniqueSelectedStaff.length,
      deduplicationApplied: selectedStaff.length !== uniqueSelectedStaff.length,
      isLoading
    });
    
    console.log('🎯 [UI_DEBUG] FINAL staff IDs for UI display:', uniqueSelectedStaff);
    
    // NEW: Log the full timeSlots array structure
    console.log('📋 [UI_DEBUG] Full timeSlots array received by DateTimeForm:', timeSlots);
    
    if (timeSlots.length === 0) {
      console.log('⚠️ [UI_DEBUG] WARNING: timeSlots array is empty!');
    }
    
    const availableSlots = timeSlots.filter(s => s.available);
    if (availableSlots.length === 0 && timeSlots.length > 0) {
      console.log('⚠️ [UI_DEBUG] WARNING: No available slots found in timeSlots array!');
      console.log('❌ [UI_DEBUG] All slots marked as unavailable:', timeSlots.map(s => `${s.time}: ${s.available}`));
    }
    
  }, [timeSlots, date, selectedTimeSlotId, isLoading, selectedStaff, uniqueSelectedStaff]);

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
        <BrandedLoading message="Processando seu agendamento..." />
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
              disabled={(date) => isDateDisabled(date)}
              className="rounded-md border transition-all duration-200 hover:shadow-md"
            />
            {availabilityLoading && (
              <p className="text-sm text-muted-foreground mt-2 animate-pulse">
                Carregando disponibilidade para {uniqueSelectedStaff.length} profissionais únicos...
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
                <div>
                  {/* Enhanced UI debugging info for multi-staff with deduplication */}
                  <div className="mb-4 p-3 bg-gray-100 rounded text-xs space-y-1">
                    <div><span className="font-bold">Total slots:</span> {timeSlots.length}</div>
                    <div><span className="font-bold">Available slots:</span> {timeSlots.filter(s => s.available).length}</div>
                    <div><span className="font-bold">Original staff:</span> {selectedStaff.length} selection(s)</div>
                    <div><span className="font-bold">Unique staff:</span> {uniqueSelectedStaff.length} professional(s)</div>
                    <div><span className="font-bold">Deduplication applied:</span> {selectedStaff.length !== uniqueSelectedStaff.length ? 'YES' : 'NO'}</div>
                    <div><span className="font-bold">Unique Staff IDs:</span> {uniqueSelectedStaff.join(', ')}</div>
                    <div><span className="font-bold">Service Duration:</span> {serviceDuration} minutes</div>
                    {timeSlots.length > 0 && timeSlots.filter(s => s.available).length === 0 && (
                      <div className="text-red-600 font-bold">⚠️ All slots marked as unavailable!</div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot.id}
                        type="button"
                        variant={selectedTimeSlotId === slot.id ? "default" : "outline"}
                        className="h-auto py-2 transition-all duration-200 hover:scale-105"
                        onClick={() => {
                          console.log('🎯 [UI_CLICK] Slot clicked (multi-staff DEDUPLICATED):', slot, 'for unique staff:', uniqueSelectedStaff);
                          setSelectedTimeSlotId(slot.id);
                        }}
                        disabled={!slot.available || isLoading}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mt-2">
                    Nenhum horário disponível para esta data com os profissionais selecionados.
                  </p>
                  <div className="mt-2 p-3 bg-red-100 rounded text-xs space-y-1">
                    <div><span className="font-bold">Debug: Total slots =</span> {timeSlots.length}</div>
                    <div><span className="font-bold">Debug: Loading =</span> {isLoading.toString()}</div>
                    <div><span className="font-bold">Debug: Date =</span> {date?.toISOString()}</div>
                    <div><span className="font-bold">Debug: Original staff count =</span> {selectedStaff.length}</div>
                    <div><span className="font-bold">Debug: Unique staff count =</span> {uniqueSelectedStaff.length}</div>
                    <div><span className="font-bold">Debug: Original Staff IDs =</span> {selectedStaff.join(', ')}</div>
                    <div><span className="font-bold">Debug: Unique Staff IDs =</span> {uniqueSelectedStaff.join(', ')}</div>
                    <div><span className="font-bold">Debug: Service Duration =</span> {serviceDuration} minutes</div>
                  </div>
                </div>
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
