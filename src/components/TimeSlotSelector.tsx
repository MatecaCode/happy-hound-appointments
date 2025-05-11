
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, AlertTriangle } from 'lucide-react';
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
  // Check if there are any available time slots
  const hasAvailableSlots = timeSlots.some(slot => slot.available);

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
          {timeSlots.map((slot) => {
            if (slot.available) {
              return (
                <Button
                  key={slot.id}
                  variant={selectedTimeSlotId === slot.id ? "default" : "outline"}
                  onClick={() => onSelectTimeSlot(slot.id)}
                >
                  {slot.time}
                </Button>
              );
            } else {
              return (
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
              );
            }
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TimeSlotSelector;
