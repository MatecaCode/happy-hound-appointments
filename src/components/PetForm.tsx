
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
        // Create new pet - let the database trigger handle user_id assignment
        // We explicitly omit user_id as the trigger will set it
        const insertPayload: Omit<any, 'user_id' | 'id' | 'created_at' | 'updated_at'> = {
          name: name.trim(),
          breed: breed.trim() || null,
          age: age.trim() || null
        };
        
        console.log('🆕 Creating pet with payload (without user_id):', insertPayload);
        console.log('🔍 Current auth state check...');
        
        // Check current session for debugging
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('🔐 Current session:', { 
          user: sessionData.session?.user?.id, 
          error: sessionError 
        });
        
        const { error, data } = await supabase
          .from('pets')
          .insert(insertPayload)
          .select();

        console.log('🆕 Insert result:', { error, data });

        if (error) {
          console.error('❌ Insert error:', error);
          toast.error('Erro ao adicionar pet: ' + error.message);
        } else {
          console.log('✅ Pet created successfully:', data);
          toast.success('Pet adicionado com sucesso!');
          // Clear form for new entries
          setName('');
          setBreed('');
          setAge('');
          onSuccess?.();
        }
      }
    } catch (err: any) {
      console.error('💥 Unexpected error in pet submission:', err);
      toast.error('Erro inesperado: ' + (err.message || 'Erro desconhecido'));
    } finally {
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
