
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { setupResourceTypes } from '@/utils/setupResourceTypes';
import { toast } from 'sonner';

const SetupResourceTypes = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const success = await setupResourceTypes();
      if (success) {
        toast.success('Tipos de recursos configurados com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao configurar tipos de recursos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Configurar Tipos de Recursos</CardTitle>
        <CardDescription>
          Configure os tipos de recursos para o sistema de agendamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleSetup} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Configurando...' : 'Configurar Recursos'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SetupResourceTypes;
