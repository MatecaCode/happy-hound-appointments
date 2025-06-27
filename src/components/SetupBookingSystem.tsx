
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { setupBookingSystemData } from '@/utils/setupBookingSystem';
import { toast } from 'sonner';

const SetupBookingSystem = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const success = await setupBookingSystemData();
      if (success) {
        toast.success('Sistema de agendamento configurado com sucesso!');
      } else {
        toast.error('Erro ao configurar sistema de agendamento');
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Erro ao configurar sistema de agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>🔧 Setup do Sistema</CardTitle>
        <CardDescription>
          Configure os dados básicos necessários para o funcionamento do sistema de agendamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleSetup} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Configurando...' : 'Configurar Sistema'}
        </Button>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Este botão irá:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Criar serviços de tosa básicos</li>
            <li>Criar perfis de tosadores de teste</li>
            <li>Configurar recursos necessários</li>
            <li>Gerar disponibilidade de tosadores</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SetupBookingSystem;
