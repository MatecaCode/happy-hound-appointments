
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { refreshAvailability, RefreshAvailabilityResponse } from '@/utils/refreshAvailability';

const RefreshAvailabilityButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<RefreshAvailabilityResponse | null>(null);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const result = await refreshAvailability();
      setLastResult(result);
    } catch (error) {
      console.error('Error refreshing availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Atualizar Disponibilidade</CardTitle>
        <CardDescription>
          Gera horários disponíveis para todos os profissionais nos próximos 7 dias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleRefresh} 
          disabled={isLoading}
          className="w-full"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Atualizando...' : 'Atualizar Disponibilidade'}
        </Button>
        
        {lastResult && (
          <div className="text-sm space-y-2">
            <div className={`p-3 rounded ${lastResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="font-medium">
                {lastResult.success ? '✅ Sucesso' : '❌ Erro'}
              </p>
              <p>{lastResult.message}</p>
            </div>
            
            {lastResult.success && lastResult.breakdown && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded text-xs">
                <p><strong>Total de slots:</strong> {lastResult.totalSlots}</p>
                <p><strong>Tosadores:</strong> {lastResult.breakdown.groomers} profissionais</p>
                <p><strong>Veterinários:</strong> {lastResult.breakdown.veterinarians} profissionais</p>
                <p><strong>Dias gerados:</strong> {lastResult.breakdown.daysGenerated}</p>
                <p><strong>Horários por dia:</strong> {lastResult.breakdown.timeSlotsPerDay}</p>
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          <p>• Gera slots de 30min das 09:00 às 17:00</p>
          <p>• Tosadores/Veterinários: 1 agendamento por slot</p>
          <p>• Banhos: 5 animais por slot compartilhado</p>
          <p>• Usa upsert para evitar duplicatas</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RefreshAvailabilityButton;
