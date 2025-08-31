
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
      console.log('🔧 Creating test data with Phase 1 schema...');

      // Create test staff profiles instead of provider_profiles
      const staffProfiles = [
        { 
          id: 'staff-profile-1', 
          user_id: 'test-user-1', 
          location_id: 'default-location-1',
          name: 'Alice Silva',
          can_groom: true,
          can_bathe: true,
          can_vet: false,
          bio: 'Especialista em tosa criativa',
          active: true
        },
        { 
          id: 'staff-profile-2', 
          user_id: 'test-user-2', 
          location_id: 'default-location-1',
          name: 'Bob Santos',
          can_groom: true,
          can_bathe: true,
          can_vet: false,
          bio: 'Tosa profissional há 10 anos',
          active: true
        },
        { 
          id: 'staff-profile-3', 
          user_id: 'test-user-3', 
          location_id: 'default-location-1',
          name: 'Dr. Carlos Vet',
          can_groom: false,
          can_bathe: false,
          can_vet: true,
          bio: 'Veterinário clínico geral',
          active: true
        }
      ];

      // Insert staff profiles
      const { error: staffError } = await supabase
        .from('staff_profiles')
        .upsert(staffProfiles, { onConflict: 'id' });

      if (staffError) throw staffError;

      // Create availability for the next 7 days
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Create 10-minute time slots (Phase 1 logic)
      const timeSlots = [];
      for (let hour = 9; hour < 17; hour++) {
        for (let min = 0; min < 60; min += 10) {
          timeSlots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`);
        }
      }

      const availabilitySlots = [];

      // Create availability for all staff profiles
      for (const staff of staffProfiles) {
        for (const dateStr of dates) {
          for (const timeSlot of timeSlots) {
            availabilitySlots.push({
              staff_profile_id: staff.id,
              date: dateStr,
              time_slot: timeSlot,
              available: true
            });
          }
        }
      }

      // Insert availability using new staff_availability table
      const { error: availabilityError } = await supabase
        .from('staff_availability')
        .upsert(availabilitySlots, { onConflict: 'staff_profile_id,date,time_slot' });

      if (availabilityError) throw availabilityError;

      console.log('✅ Test data created successfully with 10-minute availability slots for next 7 days');
      toast.success('Dados de teste criados com sucesso com slots de 10 minutos!');

    } catch (error: any) {
      console.error('💥 Error creating test data:', error);
      toast.error('Erro ao criar dados de teste: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const createStaffAvailability = async () => {
    setIsCreating(true);
    try {
      console.log('🔧 Creating availability for all registered staff...');

      // Get all registered staff from the database
      const { data: registeredStaff, error: staffFetchError } = await supabase
        .from('staff_profiles')
        .select('id, name, can_bathe, can_groom, can_vet')
        .eq('active', true);

      if (staffFetchError) throw staffFetchError;

      if (!registeredStaff || registeredStaff.length === 0) {
        toast.info('Nenhum staff encontrado no sistema');
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

      console.log(`📅 Creating availability for ${registeredStaff.length} staff for next 14 days`);

      // Create 10-minute time slots
      const timeSlots = [];
      for (let hour = 9; hour <= 17; hour++) {
        for (let min = 0; min < 60; min += 10) {
          timeSlots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`);
        }
      }

      const availabilitySlots = [];

      // Create availability for all registered staff
      for (const staff of registeredStaff) {
        console.log(`👨‍💼 Processing staff: ${staff.name} (${staff.id})`);
        
        for (const dateStr of dates) {
          for (const timeSlot of timeSlots) {
            availabilitySlots.push({
              staff_profile_id: staff.id,
              date: dateStr,
              time_slot: timeSlot,
              available: true
            });
          }
        }
      }

      // Insert availability in batches
      const batchSize = 100;
      for (let i = 0; i < availabilitySlots.length; i += batchSize) {
        const batch = availabilitySlots.slice(i, i + batchSize);
        const { error: batchError } = await supabase
          .from('staff_availability')
          .upsert(batch, { onConflict: 'staff_profile_id,date,time_slot' });

        if (batchError) {
          console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, batchError);
        }
      }

      console.log('✅ Availability created for all registered staff');
      toast.success(`Disponibilidade criada para ${registeredStaff.length} profissionais!`);

    } catch (error: any) {
      console.error('💥 Error creating staff availability:', error);
      toast.error('Erro ao criar disponibilidade: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Dados de Teste (Fase 1)</CardTitle>
          <CardDescription>
            Criar staff de teste com disponibilidade em slots de 10 minutos
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
          <CardTitle>Disponibilidade para Staff</CardTitle>
          <CardDescription>
            Criar disponibilidade para todos os staff registrados (slots de 10min)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={createStaffAvailability} 
            disabled={isCreating}
            className="w-full"
            variant="outline"
          >
            {isCreating ? 'Criando...' : 'Criar Disponibilidade'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTestData;
