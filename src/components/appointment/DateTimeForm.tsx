
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import NextAvailableAppointment from '../NextAvailableAppointment';
import { NextAvailable } from '@/hooks/useAppointmentForm';

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface DateTimeFormProps {
  date: Date;
  setDate: (date: Date) => void;
  timeSlots: TimeSlot[];
  selectedTimeSlotId: string | null;
  setSelectedTimeSlotId: (id: string) => void;
  nextAvailable: NextAvailable | null;
  handleNextAvailableSelect: () => void;
  isLoading: boolean;
  activeTab: 'calendar' | 'next-available';
  setActiveTab: (tab: 'calendar' | 'next-available') => void;
  notes: string;
  setNotes: (notes: string) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
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
  onSubmit
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const toDate = new Date();
  toDate.setMonth(today.getMonth() + 3);
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">3. Escolha da Data e Hora</h2>
          <Button variant="ghost" size="sm" onClick={onBack}>Voltar</Button>
        </div>
        
        <Tabs defaultValue="calendar" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar">Calendário</TabsTrigger>
            <TabsTrigger value="next">Próximo Disponível</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-4">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    className="mx-auto pointer-events-auto"
                    locale={ptBR}
                    disabled={(date) => {
                      return date < today;
                    }}
                    fromDate={today}
                    toDate={toDate}
                  />
                </CardContent>
              </Card>
              
              <div>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-4">
                      Horários para {format(date, 'dd/MM/yyyy', { locale: ptBR })}
                    </h3>
                    
                    {isLoading ? (
                      <p className="text-center text-muted-foreground">Carregando horários...</p>
                    ) : timeSlots.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        Selecione um tosador primeiro para ver os horários disponíveis
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {timeSlots.map((slot) => (
                          <Button
                            key={slot.id}
                            variant={selectedTimeSlotId === slot.id ? "default" : "outline"}
                            size="sm"
                            disabled={!slot.available}
                            onClick={() => setSelectedTimeSlotId(slot.id)}
                            className="justify-center"
                          >
                            {slot.time}
                            {!slot.available && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Ocupado
                              </Badge>
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    {timeSlots.filter(slot => slot.available).length === 0 && timeSlots.length > 0 && (
                      <p className="text-center text-muted-foreground mt-4">
                        Não há horários disponíveis para esta data. Tente outra data ou use "Próximo Disponível".
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="next">
            <div className="py-6">
              <NextAvailableAppointment
                nextAvailable={nextAvailable}
                onSelect={handleNextAvailableSelect}
                loading={isLoading}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <div>
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alguma observação importante sobre o pet?"
            rows={3}
          />
        </div>
      </div>
      
      <Button type="submit" disabled={isLoading || !selectedTimeSlotId} onClick={onSubmit}>
        {isLoading ? 'Agendando...' : 'Concluir Agendamento'}
      </Button>
    </>
  );
};

export default DateTimeForm;
