
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CreateTestData = () => {
  const [isCreating, setIsCreating] = useState(false);

  const createTestData = async () => {
    setIsCreating(true);
    try {
      console.log('🔧 Creating test data...');

      // Create test groomers
      const groomers = [
        { id: 'groomer-1', name: 'Ana Santos', role: 'groomer' },
        { id: 'groomer-2', name: 'Carlos Silva', role: 'groomer' },
        { id: 'groomer-3', name: 'Maria Oliveira', role: 'groomer' }
      ];

      // Create test vets
      const vets = [
        { id: 'vet-1', name: 'Dr. João Costa', role: 'vet' },
        { id: 'vet-2', name: 'Dra. Paula Lima', role: 'vet' }
      ];

      // Insert groomers
      const { error: groomerError } = await supabase
        .from('profiles')
        .upsert(groomers, { onConflict: 'id' });

      if (groomerError) throw groomerError;

      // Insert vets
      const { error: vetError } = await supabase
        .from('profiles')
        .upsert(vets, { onConflict: 'id' });

      if (vetError) throw vetError;

      // Create availability for June 9, 2025
      const availabilities = [];
      const targetDate = '2025-06-09';
      const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

      // Add availability for groomers
      for (const groomer of groomers) {
        for (const timeSlot of timeSlots) {
          availabilities.push({
            provider_id: groomer.id,
            date: targetDate,
            time_slot: timeSlot,
            available: true
          });
        }
      }

      // Add availability for vets
      for (const vet of vets) {
        for (const timeSlot of timeSlots) {
          availabilities.push({
            provider_id: vet.id,
            date: targetDate,
            time_slot: timeSlot,
            available: true
          });
        }
      }

      // Insert availability
      const { error: availError } = await supabase
        .from('provider_availability')
        .upsert(availabilities, { onConflict: 'provider_id,date,time_slot' });

      if (availError) throw availError;

      console.log('✅ Test data created successfully');
      toast.success('Dados de teste criados com sucesso!');

    } catch (error: any) {
      console.error('💥 Error creating test data:', error);
      toast.error('Erro ao criar dados de teste: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar Dados de Teste</CardTitle>
        <CardDescription>
          Criar tosadores e veterinários de teste com disponibilidade para 09/06/2025
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={createTestData} 
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? 'Criando...' : 'Criar Dados de Teste'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CreateTestData;
