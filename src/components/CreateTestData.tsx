
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

      // Create availability using the new system for the next 7 days
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Create availability for groomers using the new function
      for (const groomer of groomers) {
        for (const dateStr of dates) {
          const { error: groomerAvailError } = await supabase.rpc('create_availability_slots', {
            p_resource_type: 'groomer',
            p_date: dateStr,
            p_provider_id: groomer.id,
            p_start_time: '09:00',
            p_end_time: '17:00'
          });

          if (groomerAvailError) {
            console.error(`Error creating groomer availability for ${groomer.name} on ${dateStr}:`, groomerAvailError);
          }
        }
      }

      // Create availability for vets using the new function
      for (const vet of vets) {
        for (const dateStr of dates) {
          const { error: vetAvailError } = await supabase.rpc('create_availability_slots', {
            p_resource_type: 'veterinary',
            p_date: dateStr,
            p_provider_id: vet.id,
            p_start_time: '09:00',
            p_end_time: '17:00'
          });

          if (vetAvailError) {
            console.error(`Error creating vet availability for ${vet.name} on ${dateStr}:`, vetAvailError);
          }
        }
      }

      // Create shared shower availability (no specific provider)
      for (const dateStr of dates) {
        const { error: showerAvailError } = await supabase.rpc('create_availability_slots', {
          p_resource_type: 'shower',
          p_date: dateStr,
          p_provider_id: null,
          p_start_time: '09:00',
          p_end_time: '17:00'
        });

        if (showerAvailError) {
          console.error(`Error creating shower availability for ${dateStr}:`, showerAvailError);
        }
      }

      console.log('✅ Test data created successfully with availability for next 7 days');
      toast.success('Dados de teste criados com sucesso!');

    } catch (error: any) {
      console.error('💥 Error creating test data:', error);
      toast.error('Erro ao criar dados de teste: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const createGroomerAvailability = async () => {
    setIsCreating(true);
    try {
      console.log('🔧 Creating availability for all registered groomers...');

      // Get all registered groomers from the database
      const { data: registeredGroomers, error: groomerFetchError } = await supabase
        .from('groomers')
        .select('id, name');

      if (groomerFetchError) throw groomerFetchError;

      if (!registeredGroomers || registeredGroomers.length === 0) {
        toast.info('Nenhum tosador encontrado no sistema');
        return;
      }

      // Create availability for the next 14 days
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      console.log(`📅 Creating availability for ${registeredGroomers.length} groomers for next 14 days`);

      // Create availability for all registered groomers
      for (const groomer of registeredGroomers) {
        console.log(`👨‍💼 Processing groomer: ${groomer.name} (${groomer.id})`);
        
        for (const dateStr of dates) {
          const { error: groomerAvailError } = await supabase.rpc('create_availability_slots', {
            p_resource_type: 'groomer',
            p_date: dateStr,
            p_provider_id: groomer.id,
            p_start_time: '09:00',
            p_end_time: '17:00'
          });

          if (groomerAvailError) {
            console.error(`❌ Error creating availability for ${groomer.name} on ${dateStr}:`, groomerAvailError);
          }
        }
      }

      // Also create shower availability for grooming services
      console.log('🚿 Creating shower availability...');
      for (const dateStr of dates) {
        const { error: showerAvailError } = await supabase.rpc('create_availability_slots', {
          p_resource_type: 'shower',
          p_date: dateStr,
          p_provider_id: null,
          p_start_time: '09:00',
          p_end_time: '17:00'
        });

        if (showerAvailError) {
          console.error(`❌ Error creating shower availability for ${dateStr}:`, showerAvailError);
        }
      }

      console.log('✅ Availability created for all registered groomers');
      toast.success(`Disponibilidade criada para ${registeredGroomers.length} tosadores!`);

    } catch (error: any) {
      console.error('💥 Error creating groomer availability:', error);
      toast.error('Erro ao criar disponibilidade: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Dados de Teste</CardTitle>
          <CardDescription>
            Criar tosadores e veterinários de teste com disponibilidade
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

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Disponibilidade para Tosadores</CardTitle>
          <CardDescription>
            Criar disponibilidade para todos os tosadores registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={createGroomerAvailability} 
            disabled={isCreating}
            className="w-full"
            variant="outline"
          >
            {isCreating ? 'Criando...' : 'Criar Disponibilidade'}
          </Button>
        </CardContent>
      </CardContent>
    </div>
  );
};

export default CreateTestData;
