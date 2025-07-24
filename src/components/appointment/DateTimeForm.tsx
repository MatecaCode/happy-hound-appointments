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

  const uniqueSelectedStaff = React.useMemo(() => {
    const unique = [...new Set(selectedStaff)];
    return unique;
  }, [selectedStaff]);
  
  const { isDateDisabled, isLoading: availabilityLoading } = useStaffAvailability({
    selectedStaffIds: uniqueSelectedStaff,
    serviceDuration: serviceDuration
  });

  // Dynamic date range based on staff selection
  const calendarDateRange = React.useMemo(() => {
    if (uniqueSelectedStaff.length === 0) {
      // If no staff selected, show next 30 days as fallback
      return {
        fromDate: new Date(),
        toDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
    }
    // When staff are selected, show up to 365 days to match availability hook
    return {
      fromDate: new Date(),
      toDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };
  }, [uniqueSelectedStaff.length]);

  // CRITICAL: Log prop received by DateTimeForm
  React.useEffect(() => {
    console.log('\n🔥 ===== DateTimeForm PROP RECEIVED =====');
    console.log('🔥 timeSlots prop:', timeSlots);
    console.log('🔥 timeSlots.length:', timeSlots?.length || 0);
    console.log('🔥 Available slots in prop:', timeSlots?.filter(s => s.available)?.length || 0);
    console.log('🔥 Full timeSlots array:', JSON.stringify(timeSlots, null, 2));
    console.log('🔥 selectedStaff:', selectedStaff);
    console.log('🔥 serviceDuration:', serviceDuration);
    console.log('🔥 date:', date?.toISOString());
  }, [timeSlots, selectedStaff, serviceDuration, date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit && onSubmit) {
      onSubmit(e);
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setSelectedTimeSlotId(null);
  };

  // Render available time slot buttons
  const renderTimeSlots = () => {
    console.log('\n🔥 ===== renderTimeSlots CALLED =====');
    console.log('🔥 timeSlots in render:', timeSlots);
    
    if (!timeSlots || timeSlots.length === 0) {
      console.log('❌ No timeSlots to render - array is empty or null');
      return null;
    }

    const availableSlots = timeSlots.filter(slot => slot.available);
    console.log('🔥 Available slots for rendering:', availableSlots);

    return timeSlots.map((slot, index) => {
      console.log(`🔥 Rendering button ${index}:`, slot);
      return (
        <Button
          key={slot.id}
          type="button"
          variant={selectedTimeSlotId === slot.id ? "default" : "outline"}
          className={`h-auto py-2 transition-all duration-200 hover:scale-105 ${
            slot.available ? '' : 'opacity-50 cursor-not-allowed'
          }`}
          onClick={() => {
            if (slot.available) {
              setSelectedTimeSlotId(slot.id);
            }
          }}
          disabled={!slot.available || isLoading}
        >
          {slot.time}
          {!slot.available && <span className="ml-1 text-xs">✕</span>}
        </Button>
      );
    });
  };

  // Full screen loading overlay
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
              fromDate={calendarDateRange.fromDate}
              toDate={calendarDateRange.toDate}
              fromYear={calendarDateRange.fromDate.getFullYear()}
              toYear={calendarDateRange.toDate.getFullYear()}
              toMonth={calendarDateRange.toDate}
              captionLayout="dropdown-buttons"
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
              
              {/* CRITICAL: Debug panel to verify data flow */}
              <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded text-xs">
                <div className="font-bold mb-3 text-blue-800">🔥 UI PROP VERIFICATION</div>
                <div className="space-y-1">
                  <div><span className="font-bold">Prop received:</span> {new Date().toISOString()}</div>
                  <div><span className="font-bold">timeSlots type:</span> {typeof timeSlots}</div>
                  <div><span className="font-bold">timeSlots isArray:</span> {Array.isArray(timeSlots).toString()}</div>
                  <div><span className="font-bold">timeSlots length:</span> {timeSlots?.length || 'undefined'}</div>
                  <div><span className="font-bold">Available count:</span> {timeSlots?.filter(s => s?.available)?.length || 0}</div>
                  <div><span className="font-bold">Unavailable count:</span> {timeSlots?.filter(s => !s?.available)?.length || 0}</div>
                </div>

                {timeSlots && timeSlots.length > 0 ? (
                  <div className="mt-3 max-h-32 overflow-y-auto">
                    <table className="w-full text-xs border">
                      <thead>
                        <tr className="bg-blue-100">
                          <th className="p-1 border text-left">Index</th>
                          <th className="p-1 border text-left">ID</th>
                          <th className="p-1 border text-left">Time</th>
                          <th className="p-1 border text-left">Available</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map((slot, index) => (
                          <tr key={index} className={slot?.available ? 'bg-green-50' : 'bg-red-50'}>
                            <td className="p-1 border">{index}</td>
                            <td className="p-1 border">{slot?.id || 'MISSING'}</td>
                            <td className="p-1 border">{slot?.time || 'MISSING'}</td>
                            <td className="p-1 border">{slot?.available ? '✅ TRUE' : '❌ FALSE'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-red-200 border border-red-400 rounded">
                    <div className="font-bold text-red-800">❌ NO SLOTS IN PROP</div>
                  </div>
                )}
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Carregando horários...</span>
                </div>
              ) : timeSlots.length > 0 ? (
                <div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {renderTimeSlots()}
                  </div>
                  
                  {/* Verify buttons are actually rendered */}
                  <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                    <div><span className="font-bold">Buttons rendered:</span> {timeSlots.length}</div>
                    <div><span className="font-bold">Available buttons:</span> {timeSlots.filter(s => s.available).length}</div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mt-2">
                    Nenhum horário disponível para esta data com os profissionais selecionados.
                  </p>
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
