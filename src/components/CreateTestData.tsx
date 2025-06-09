
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

      // Create test groomers directly in groomers table
      const groomers = [
        { id: 'groomer-1', name: 'Ana Santos' },
        { id: 'groomer-2', name: 'Carlos Silva' },
        { id: 'groomer-3', name: 'Maria Oliveira' }
      ];

      // Create test vets directly in veterinarians table
      const vets = [
        { id: 'vet-1', name: 'Dr. João Costa' },
        { id: 'vet-2', name: 'Dra. Paula Lima' }
      ];

      // Insert groomers into groomers table
      const { error: groomerError } = await supabase
        .from('groomers')
        .upsert(groomers, { onConflict: 'id' });

      if (groomerError) throw groomerError;

      // Insert vets into veterinarians table
      const { error: vetError } = await supabase
        .from('veterinarians')
        .upsert(vets, { onConflict: 'id' });

      if (vetError) throw vetError;

      // Create availability using the new system for June 9, 2025
      const targetDate = '2025-06-09';

      // Create availability for groomers using the new function
      for (const groomer of groomers) {
        const { error: groomerAvailError } = await supabase.rpc('create_availability_slots', {
          p_resource_type: 'groomer',
          p_date: targetDate,
          p_provider_id: groomer.id,
          p_start_time: '09:00',
          p_end_time: '17:00'
        });

        if (groomerAvailError) throw groomerAvailError;
      }

      // Create availability for vets using the new function
      for (const vet of vets) {
        const { error: vetAvailError } = await supabase.rpc('create_availability_slots', {
          p_resource_type: 'veterinary',
          p_date: targetDate,
          p_provider_id: vet.id,
          p_start_time: '09:00',
          p_end_time: '17:00'
        });

        if (vetAvailError) throw vetAvailError;
      }

      // Create shared shower availability (no specific provider)
      const { error: showerAvailError } = await supabase.rpc('create_availability_slots', {
        p_resource_type: 'shower',
        p_date: targetDate,
        p_provider_id: null,
        p_start_time: '09:00',
        p_end_time: '17:00'
      });

      if (showerAvailError) throw showerAvailError;

      console.log('✅ Test data created successfully with new availability system');
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
