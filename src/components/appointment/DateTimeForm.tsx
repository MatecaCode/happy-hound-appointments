
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
  onNext?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  showTimeSlots?: boolean;
  showSubmitButton?: boolean;
  stepTitle?: string;
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
  onNext,
  onSubmit,
  showTimeSlots = true,
  showSubmitButton = true,
  stepTitle = "2. Escolha da Data"
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const toDate = new Date();
  toDate.setMonth(today.getMonth() + 3);

  // Handle time slot selection (just select, don't submit)
  const handleTimeSlotClick = (timeSlotId: string) => {
    console.log('🔍 DEBUG: Time slot clicked (selecting only):', timeSlotId);
    setSelectedTimeSlotId(timeSlotId);
  };

  // Handle form submission (only when submit button is clicked)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 DEBUG: Form submitted via submit button');
    if (onSubmit) {
      onSubmit(e);
    }
  };
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{stepTitle}</h2>
          <Button variant="ghost" size="sm" onClick={onBack}>Voltar</Button>
        </div>
        
        {!showTimeSlots ? (
          // Date-only selection for step 2
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">
                Selecione uma data para ver os profissionais disponíveis
              </h3>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                className="mx-auto pointer-events-auto"
                locale={ptBR}
                disabled={(date) => {
                  const dayOfWeek = date.getDay();
                  return date < today || dayOfWeek === 0; // Disable past dates and Sundays
                }}
                fromDate={today}
                toDate={toDate}
              />
            </CardContent>
          </Card>
        ) : (
          // Time-only selection for final step (no calendar needed)
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    Horários para {format(date, 'dd/MM/yyyy', { locale: ptBR })}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('next')}
                  >
                    Ver Próximo Disponível
                  </Button>
                </div>
                
                {isLoading ? (
                  <p className="text-center text-muted-foreground">Carregando horários...</p>
                ) : timeSlots.length === 0 ? (
                  <p className="text-center text-muted-foreground">
                    Nenhum horário disponível para esta data
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot.id}
                        variant={selectedTimeSlotId === slot.id ? "default" : "outline"}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => handleTimeSlotClick(slot.id)}
                        className="justify-center"
                        type="button"
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
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-center text-yellow-800 font-medium">
                      Não há horários disponíveis para esta data
                    </p>
                    <p className="text-center text-yellow-700 text-sm mt-1">
                      Tente selecionar outra data ou use "Próximo Disponível"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Available Option */}
            {activeTab === 'next' && (
              <Card>
                <CardContent className="p-4">
                  <NextAvailableAppointment
                    nextAvailable={nextAvailable}
                    onSelect={handleNextAvailableSelect}
                    loading={isLoading}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {showTimeSlots && (
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
        )}
      </div>
      
      <div className="flex justify-between">
        {!showTimeSlots && (
          <Button onClick={onNext} disabled={!date} type="button">
            Continuar
          </Button>
        )}
        
        {showSubmitButton && onSubmit && (
          <Button 
            type="button" 
            disabled={isLoading || !selectedTimeSlotId} 
            onClick={handleFormSubmit}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Agendando...' : 'Concluir Agendamento'}
          </Button>
        )}
      </div>
    </>
  );
};

export default DateTimeForm;
