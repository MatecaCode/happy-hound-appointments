
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Calendar } from 'lucide-react';
import { refreshAvailability, rollDailyAvailability, RefreshAvailabilityResponse } from '@/utils/refreshAvailability';

const RefreshAvailabilityButton = () => {
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false);
  const [isLoadingRoll, setIsLoadingRoll] = useState(false);
  const [lastRefreshResult, setLastRefreshResult] = useState<RefreshAvailabilityResponse | null>(null);
  const [lastRollResult, setLastRollResult] = useState<RefreshAvailabilityResponse | null>(null);

  const handleRefresh = async () => {
    setIsLoadingRefresh(true);
    try {
      const result = await refreshAvailability();
      setLastRefreshResult(result);
    } catch (error) {
      console.error('Error refreshing availability:', error);
    } finally {
      setIsLoadingRefresh(false);
    }
  };

  const handleRoll = async () => {
    setIsLoadingRoll(true);
    try {
      const result = await rollDailyAvailability();
      setLastRollResult(result);
    } catch (error) {
      console.error('Error rolling daily availability:', error);
    } finally {
      setIsLoadingRoll(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Gerenciar Disponibilidade</CardTitle>
        <CardDescription>
          Ferramentas para atualizar e estender a disponibilidade do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button 
            onClick={handleRefresh} 
            disabled={isLoadingRefresh}
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingRefresh ? 'animate-spin' : ''}`} />
            {isLoadingRefresh ? 'Gerando...' : 'Gerar Disponibilidade Completa'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Gera horários para todos os profissionais (próximos 7 dias)
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleRoll} 
            disabled={isLoadingRoll}
            variant="outline"
            className="w-full"
          >
            <Calendar className={`w-4 h-4 mr-2 ${isLoadingRoll ? 'animate-spin' : ''}`} />
            {isLoadingRoll ? 'Estendendo...' : 'Estender Disponibilidade Diária'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Adiciona +1 dia ao final da janela de 90 dias
          </p>
        </div>
        
        {lastRefreshResult && (
          <div className="text-sm space-y-2">
            <h4 className="font-medium">Última Geração Completa:</h4>
            <div className={`p-3 rounded ${lastRefreshResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="font-medium">
                {lastRefreshResult.success ? '✅ Sucesso' : '❌ Erro'}
              </p>
              <p>{lastRefreshResult.message}</p>
            </div>
            
            {lastRefreshResult.success && lastRefreshResult.breakdown && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded text-xs">
                <p><strong>Total de slots:</strong> {lastRefreshResult.totalSlots}</p>
                <p><strong>Tosadores:</strong> {lastRefreshResult.breakdown.groomers} profissionais</p>
                <p><strong>Veterinários:</strong> {lastRefreshResult.breakdown.veterinarians} profissionais</p>
                <p><strong>Dias gerados:</strong> {lastRefreshResult.breakdown.daysGenerated}</p>
              </div>
            )}
          </div>
        )}

        {lastRollResult && (
          <div className="text-sm space-y-2">
            <h4 className="font-medium">Última Extensão Diária:</h4>
            <div className={`p-3 rounded ${lastRollResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="font-medium">
                {lastRollResult.success ? '✅ Sucesso' : '❌ Erro'}
              </p>
              <p>{lastRollResult.message}</p>
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Sistema mantém janela rolante de 90 dias</p>
          <p>• Tosadores/Veterinários: 1 agendamento por slot</p>
          <p>• Banhos: 5 animais por slot compartilhado</p>
          <p>• Horários: 09:00 às 16:00 (Segunda-Sexta) / 09:00 às 12:00 (Sábados)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RefreshAvailabilityButton;
