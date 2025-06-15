
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
    setIsSubmitting(true);
    try {
      if (editing && initialPet.id) {
        // Editing existing pet
        const updatePayload = {
          name: name.trim(),
          breed: breed.trim() || null,
          age: age.trim() || null,
          updated_at: new Date().toISOString()
        };
        const { error, data } = await supabase
          .from('pets')
          .update(updatePayload)
          .eq('id', initialPet.id)
          .eq('user_id', userId)
          .select();
        if (error) {
          toast.error('Erro ao atualizar pet: ' + error.message);
        } else if (!data || data.length === 0) {
          toast.error('Pet não foi atualizado. Você tem permissão? (RLS)');
        } else {
          toast.success('Pet atualizado com sucesso!');
          onSuccess?.();
        }
      } else {
        // Creating new
        const insertPayload = {
          user_id: userId,
          name: name.trim(),
          breed: breed.trim() || null,
          age: age.trim() || null
        };
        const { error, data } = await supabase
          .from('pets')
          .insert(insertPayload)
          .select();

        if (error) {
          console.error('Erro inserindo pet:', error, insertPayload);
          toast.error('Erro ao adicionar pet: ' + error.message);
        } else if (!data || data.length === 0) {
          toast.error('O pet não foi salvo. Sua sessão está logada? (RLS impediu inserir)');
          console.error('Insert result empty:', {insertPayload, error, data, userId});
        } else {
          toast.success('Pet adicionado com sucesso!');
          onSuccess?.();
        }
      }
    } catch (err: any) {
      console.error('Erro geral no submit:', err);
      toast.error('Erro desconhecido ao salvar.');
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
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : editing ? 'Atualizar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
}
