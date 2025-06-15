
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
    
    if (!userId || !name.trim()) {
      toast.error("Você precisa estar logado e o nome do pet não pode estar vazio.");
      return;
    }

    console.log('🐕 Starting pet submission:', { 
      userId, 
      name, 
      breed, 
      age, 
      editing, 
      petId: initialPet.id,
      authUser: (await supabase.auth.getUser()).data.user?.id
    });
    
    setIsSubmitting(true);
    
    try {
      // Check current auth state
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔐 Current auth user:', user?.id, 'Provided userId:', userId);
      
      if (authError || !user) {
        console.error('❌ Auth error:', authError);
        toast.error('Erro de autenticação. Faça login novamente.');
        return;
      }

      if (user.id !== userId) {
        console.error('❌ User ID mismatch:', { authUserId: user.id, providedUserId: userId });
        toast.error('Erro de autenticação. Recarregue a página.');
        return;
      }

      if (editing && initialPet.id) {
        // Editing existing pet
        const updatePayload = {
          name: name.trim(),
          breed: breed.trim() || null,
          age: age.trim() || null,
          updated_at: new Date().toISOString()
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
        } else if (!data || data.length === 0) {
          console.error('❌ No data returned from update - possible RLS issue');
          toast.error('Pet não foi atualizado. Verifique suas permissões.');
        } else {
          console.log('✅ Pet updated successfully:', data[0]);
          toast.success('Pet atualizado com sucesso!');
          onSuccess?.();
        }
      } else {
        // Creating new pet
        const insertPayload = {
          user_id: userId,
          name: name.trim(),
          breed: breed.trim() || null,
          age: age.trim() || null
        };
        
        console.log('🆕 Creating pet with payload:', insertPayload);
        
        const { error, data } = await supabase
          .from('pets')
          .insert(insertPayload)
          .select();

        console.log('🆕 Insert result:', { error, data });

        if (error) {
          console.error('❌ Insert error:', error);
          toast.error('Erro ao adicionar pet: ' + error.message);
        } else if (!data || data.length === 0) {
          console.error('❌ No data returned from insert - possible RLS issue');
          toast.error('Pet não foi salvo. Verifique suas permissões.');
        } else {
          console.log('✅ Pet created successfully:', data[0]);
          toast.success('Pet adicionado com sucesso!');
          // Clear form for new entries
          if (!editing) {
            setName('');
            setBreed('');
            setAge('');
          }
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
