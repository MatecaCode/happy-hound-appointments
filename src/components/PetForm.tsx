
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface PetFormProps {
  userId: string;
  initialPet?: {
    id?: string;
    name?: string;
    breed?: string;
    age?: string;
  };
  onSuccess?: () => void;
  editing?: boolean;
}

type PetInsert = Database['public']['Tables']['pets']['Insert'];

export default function PetForm({ userId, initialPet = {}, onSuccess, editing = false }: PetFormProps) {
  const [name, setName] = useState(initialPet.name || '');
  const [breed, setBreed] = useState(initialPet.breed || '');
  const [age, setAge] = useState(initialPet.age || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Form submitted - handleSubmit called!');
    console.log('📋 Form data:', { userId, name, breed, age, editing, petId: initialPet.id });
    
    if (!userId || !name.trim()) {
      console.error('❌ Validation failed:', { userId: !!userId, name: name.trim() });
      toast.error("Nome do pet é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (editing && initialPet.id) {
        // Update existing pet
        const updatePayload = {
          name: name.trim(),
          breed: breed.trim() || null,
          age: age.trim() || null,
        };
        
        console.log('📝 Updating pet with payload:', updatePayload);
        
        const { error, data } = await supabase
          .from('pets')
          .update(updatePayload)
          .eq('id', initialPet.id)
          .eq('user_id', userId)
          .select();

        console.log('📝 Update result:', { error, data });

        if (error) {
          console.error('❌ Update error:', error);
          toast.error('Erro ao atualizar pet: ' + error.message);
        } else {
          console.log('✅ Pet updated successfully');
          toast.success('Pet atualizado com sucesso!');
          onSuccess?.();
        }
      } else {
        // Create new pet - enhanced debugging
        console.log('🆕 Starting pet creation process...');
        
        // Check auth session first
        console.log('🔐 Checking auth session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('🔐 Session check result:', { 
          user: sessionData.session?.user?.id, 
          userEmail: sessionData.session?.user?.email,
          error: sessionError,
          sessionExists: !!sessionData.session 
        });

        if (!sessionData.session) {
          console.error('❌ No active session found');
          toast.error('Sessão expirada. Faça login novamente.');
          setIsSubmitting(false);
          return;
        }

        // Create insert payload
        const insertPayload = {
          name: name.trim(),
          breed: breed.trim() || null,
          age: age.trim() || null
        } as PetInsert;
        
        console.log('🆕 Creating pet with payload:', insertPayload);
        console.log('🆕 Expected flow: RLS allows insert → Trigger sets user_id');
        
        // Add timeout to prevent infinite hanging
        const insertPromise = supabase
          .from('pets')
          .insert(insertPayload)
          .select();

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Insert operation timed out')), 10000)
        );

        console.log('📡 Making insert request with 10s timeout...');
        const { error, data } = await Promise.race([insertPromise, timeoutPromise]) as any;

        console.log('🆕 Insert operation completed!');
        console.log('🆕 Insert result:', { error, data, dataLength: data?.length });

        if (error) {
          console.error('❌ Insert error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          toast.error('Erro ao adicionar pet: ' + error.message);
        } else if (!data || data.length === 0) {
          console.error('❌ Insert succeeded but returned no data');
          toast.error('Pet criado mas não foi possível confirmar. Recarregue a página.');
        } else {
          console.log('✅ Pet created successfully:', data[0]);
          toast.success('Pet adicionado com sucesso!');
          
          // Clear form for new entries
          setName('');
          setBreed('');
          setAge('');
          onSuccess?.();
        }
      }
    } catch (err: any) {
      console.error('💥 Unexpected error in pet submission:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      if (err.message === 'Insert operation timed out') {
        toast.error('Operação demorou muito. Verifique sua conexão e tente novamente.');
      } else {
        toast.error('Erro inesperado: ' + (err.message || 'Erro desconhecido'));
      }
    } finally {
      console.log('🔄 Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  console.log('🎨 PetForm render:', { userId, editing, isSubmitting, name });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nome do seu pet"
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="breed">Raça</Label>
        <Input
          id="breed"
          type="text"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          placeholder="Ex: Golden Retriever"
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="age">Idade</Label>
        <Input
          id="age"
          type="text"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Ex: 3 anos"
          disabled={isSubmitting}
        />
      </div>
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting ? 'Salvando...' : editing ? 'Atualizar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
}
