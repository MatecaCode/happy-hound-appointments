
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface TimeSlot {
  id: string;
  time: string; // Format: "HH:MM"
  available: boolean;
}

interface TimeSlotSelectorProps {
  date: Date;
  timeSlots: TimeSlot[];
  selectedTimeSlotId: string | null;
  onSelectTimeSlot: (timeSlotId: string) => void;
}

const TimeSlotSelector = ({
  date,
  timeSlots,
  selectedTimeSlotId,
  onSelectTimeSlot,
}: TimeSlotSelectorProps) => {
  // 🔍 DEBUG: Log slot data for validation
  React.useEffect(() => {
    console.log('🕐 [TIME_SLOT_SELECTOR] Rendering with slots:', {
      total_slots: timeSlots.length,
      available_slots: timeSlots.filter(s => s.available).length,
      selected_slot: selectedTimeSlotId,
      selected_slot_in_list: timeSlots.some(s => s.id === selectedTimeSlotId),
      all_slots: timeSlots.map(s => ({ id: s.id, time: s.time, available: s.available }))
    });
    
    // 🚨 CRITICAL: If selected slot is not in available slots, clear it
    if (selectedTimeSlotId && !timeSlots.some(s => s.id === selectedTimeSlotId && s.available)) {
      console.log('⚠️ [TIME_SLOT_SELECTOR] Selected slot not in available slots, clearing selection');
      onSelectTimeSlot('');
    }
  }, [timeSlots, selectedTimeSlotId, onSelectTimeSlot]);

  // Check if there are any available time slots
  const hasAvailableSlots = timeSlots.some(slot => slot.available);
  const isWeekendDay = isWeekend(date);

  if (isWeekendDay && date.getDay() === 0) { // Sunday
    return (
      <div className="text-center py-8">
        <CalendarIcon className="mx-auto h-8 w-8 text-amber-500 mb-2" />
        <p className="font-medium">Não atendemos aos domingos</p>
        <p className="text-muted-foreground mt-1">Por favor, selecione outro dia para seu agendamento</p>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Não há horários disponíveis para esta data</p>
      </div>
    );
  }

  if (!hasAvailableSlots) {
    return (
      <div className="text-center py-8 px-4">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
        <p className="font-medium">Todos os horários estão ocupados</p>
        <p className="text-muted-foreground mt-1">Por favor, selecione outra data ou escolha outro profissional</p>
      </div>
    );
  }

  const formattedDate = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Horários Disponíveis</h3>
        <p className="text-sm text-muted-foreground">
          {formattedDate}
        </p>
      </div>
      
      <ScrollArea className="h-64 pr-4">
        <div className="grid grid-cols-3 gap-2">
          {/* 🔒 CRITICAL: Only render AVAILABLE slots */}
          {timeSlots
            .filter(slot => slot.available) // Only show available slots
            .map((slot) => (
              <Button
                key={slot.id}
                variant={selectedTimeSlotId === slot.id ? "default" : "outline"}
                onClick={() => {
                  console.log('🎯 [TIME_SLOT_SELECTOR] Slot selected:', slot);
                  onSelectTimeSlot(slot.id);
                }}
              >
                {slot.time}
              </Button>
            ))}
        </div>
        
        {/* Show unavailable slots as disabled for reference */}
        {timeSlots.some(slot => !slot.available) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Horários indisponíveis:</p>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots
                .filter(slot => !slot.available)
                .map((slot) => (
                  <TooltipProvider key={slot.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="opacity-50 cursor-not-allowed"
                          disabled
                        >
                          {slot.time}
                          <span className="sr-only">Horário não disponível</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Horário não disponível</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default TimeSlotSelector;
