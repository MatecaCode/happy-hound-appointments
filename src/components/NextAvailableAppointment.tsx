
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface NextAvailable {
  date: Date;
  time: string;
  timeSlot: string;
  groomer: string;
}

interface NextAvailableAppointmentProps {
  nextAvailable: NextAvailable | null;
  onSelect: () => void;
  loading: boolean;
}

const NextAvailableAppointment = ({ 
  nextAvailable, 
  onSelect, 
  loading 
}: NextAvailableAppointmentProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Buscando próximo horário disponível...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextAvailable) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium">Nenhum horário disponível encontrado</p>
            <p className="text-muted-foreground text-sm mt-1">
              Tente selecionar uma data específica no calendário
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Próximo Horário Disponível
        </CardTitle>
        <CardDescription>
          O próximo horário livre para agendamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {format(nextAvailable.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{nextAvailable.time}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{nextAvailable.groomer}</span>
          </div>
        </div>
        
        <Button onClick={onSelect} className="w-full">
          Selecionar Este Horário
        </Button>
      </CardContent>
    </Card>
  );
};

export default NextAvailableAppointment;
