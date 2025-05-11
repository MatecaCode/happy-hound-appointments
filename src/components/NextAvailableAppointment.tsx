
import React from 'react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock } from 'lucide-react';

export interface NextAvailable {
  date: Date;
  timeSlot: {
    id: string;
    time: string;
  };
  groomer: {
    id: string;
    name: string;
  };
}

interface NextAvailableAppointmentProps {
  nextAvailable: NextAvailable | null;
  onSelect: () => void;
  loading?: boolean;
}

const NextAvailableAppointment = ({
  nextAvailable,
  onSelect,
  loading = false
}: NextAvailableAppointmentProps) => {
  if (loading) {
    return (
      <div className="bg-secondary/40 p-4 rounded-lg animate-pulse">
        <div className="h-6 bg-secondary rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-secondary rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-secondary rounded w-2/3 mb-4"></div>
        <div className="h-10 bg-secondary rounded"></div>
      </div>
    );
  }

  if (!nextAvailable) {
    return (
      <div className="bg-secondary/40 p-4 rounded-lg">
        <p className="text-muted-foreground">
          Não há horários disponíveis no momento. Por favor, entre em contato conosco.
        </p>
      </div>
    );
  }

  const formattedDate = format(nextAvailable.date, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="bg-secondary/40 p-4 rounded-lg">
      <h3 className="font-medium text-lg mb-2">Próximo Horário Disponível</h3>
      <div className="flex items-center text-sm mb-1">
        <Calendar className="mr-2 h-4 w-4" />
        <span>{formattedDate}</span>
      </div>
      <div className="flex items-center text-sm mb-3">
        <Clock className="mr-2 h-4 w-4" />
        <span>{nextAvailable.timeSlot.time} com {nextAvailable.groomer.name}</span>
      </div>
      <Button onClick={onSelect} className="w-full">
        Agendar
      </Button>
    </div>
  );
};

export default NextAvailableAppointment;
