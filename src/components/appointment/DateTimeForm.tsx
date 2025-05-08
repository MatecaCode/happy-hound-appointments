
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TimeSlotSelector, { TimeSlot } from '../TimeSlotSelector';
import NextAvailableAppointment, { NextAvailable } from '../NextAvailableAppointment';

interface DateTimeFormProps {
  date: Date;
  setDate: (date: Date) => void;
  timeSlots: TimeSlot[];
  selectedTimeSlotId: string | null;
  setSelectedTimeSlotId: (id: string) => void;
  nextAvailable: NextAvailable | null;
  handleNextAvailableSelect: () => void;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                  />
                </CardContent>
              </Card>
              
              <div>
                <TimeSlotSelector
                  date={date}
                  timeSlots={timeSlots}
                  selectedTimeSlotId={selectedTimeSlotId}
                  onSelectTimeSlot={setSelectedTimeSlotId}
                />
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
