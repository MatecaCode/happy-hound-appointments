
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NextAvailableAppointmentProps {
  nextAvailable: {
    date: string;
    time: string;
    staff_name?: string;
  } | null;
  onSelect: () => void;
  isLoading: boolean;
}

const NextAvailableAppointment: React.FC<NextAvailableAppointmentProps> = ({
  nextAvailable,
  onSelect,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-lg font-semibold text-gray-700">
            Buscando próximo horário...
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextAvailable) {
    return (
      <Card className="w-full border-yellow-200 bg-yellow-50">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-lg font-semibold text-yellow-800">
            Sem disponibilidade próxima
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-yellow-700 mb-4">
            Não há horários disponíveis nos próximos 7 dias para este serviço.
          </p>
          <p className="text-sm text-yellow-600">
            Entre em contato conosco para agendar em outras datas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const appointmentDate = new Date(nextAvailable.date);
  const isToday = appointmentDate.toDateString() === new Date().toDateString();
  const isTomorrow = appointmentDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

  let dateText = format(appointmentDate, "dd 'de' MMMM", { locale: ptBR });
  if (isToday) {
    dateText = "Hoje";
  } else if (isTomorrow) {
    dateText = "Amanhã";
  }

  return (
    <Card className="w-full border-green-200 bg-green-50">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-lg font-semibold text-green-800">
          Próximo Horário Disponível
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center space-x-6 text-green-700">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span className="font-medium">{dateText}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span className="font-medium">{nextAvailable.time}</span>
          </div>
        </div>
        
        {nextAvailable.staff_name && (
          <div className="flex items-center justify-center space-x-2 text-green-600">
            <User className="h-4 w-4" />
            <span className="text-sm">{nextAvailable.staff_name}</span>
          </div>
        )}
        
        <Button 
          onClick={onSelect}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          Selecionar Este Horário
        </Button>
      </CardContent>
    </Card>
  );
};

export default NextAvailableAppointment;
