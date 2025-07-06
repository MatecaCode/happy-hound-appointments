
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBreeds } from '@/hooks/useBreeds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Pet {
  id: string;
  name: string;
  breed?: string;
  breed_id?: string;
  age?: string;
  size?: string;
  weight?: number;
  gender?: string;
  notes?: string;
}

interface PetFormProps {
  onSuccess?: () => void;
  editingPet?: Pet;
}

const PetForm: React.FC<PetFormProps> = ({ onSuccess, editingPet }) => {
  const { user } = useAuth();
  const { breeds, isLoading: breedsLoading } = useBreeds();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: editingPet?.name || '',
    breed_id: editingPet?.breed_id || '',
    age: editingPet?.age || '',
    size: editingPet?.size || '',
    weight: editingPet?.weight || '',
    gender: editingPet?.gender || '',
    notes: editingPet?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Você precisa estar logado para cadastrar um pet');
      return;
    }

    setIsLoading(true);
    try {
      // Get client_id from user_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        toast.error('Erro ao encontrar dados do cliente');
        return;
      }

      const petData = {
        name: formData.name,
        breed_id: formData.breed_id || null,
        age: formData.age || null,
        size: formData.size || null,
        weight: formData.weight ? parseFloat(formData.weight.toString()) : null,
        gender: formData.gender || null,
        notes: formData.notes || null,
        client_id: clientData.id
      };

      let error;
      if (editingPet) {
        // Update existing pet
        const { error: updateError } = await supabase
          .from('pets')
          .update(petData)
          .eq('id', editingPet.id);
        error = updateError;
      } else {
        // Create new pet
        const { error: insertError } = await supabase
          .from('pets')
          .insert(petData);
        error = insertError;
      }

      if (error) throw error;

      toast.success(editingPet ? 'Pet atualizado com sucesso!' : 'Pet cadastrado com sucesso!');
      
      // Reset form if creating new pet
      if (!editingPet) {
        setFormData({
          name: '',
          breed_id: '',
          age: '',
          size: '',
          weight: '',
          gender: '',
          notes: ''
        });
      }
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving pet:', error);
      toast.error('Erro ao salvar pet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Pet *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="breed">Raça</Label>
          <Select 
            value={formData.breed_id} 
            onValueChange={(value) => setFormData({...formData, breed_id: value})}
            disabled={breedsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={breedsLoading ? "Carregando..." : "Selecione uma raça"} />
            </SelectTrigger>
            <SelectContent>
              {breeds.map((breed) => (
                <SelectItem key={breed.id} value={breed.id}>
                  {breed.name}
                  {breed.size_category && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({breed.size_category === 'small' ? 'Pequeno' : 
                        breed.size_category === 'medium' ? 'Médio' : 
                        breed.size_category === 'large' ? 'Grande' : 'Extra Grande'})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="age">Idade</Label>
          <Input
            id="age"
            value={formData.age}
            onChange={(e) => setFormData({...formData, age: e.target.value})}
            placeholder="Ex: 2 anos"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="size">Porte</Label>
          <Select value={formData.size} onValueChange={(value) => setFormData({...formData, size: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o porte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Pequeno</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="large">Grande</SelectItem>
              <SelectItem value="extra_large">Extra Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="weight">Peso (kg)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => setFormData({...formData, weight: e.target.value})}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="gender">Sexo</Label>
        <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o sexo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Macho</SelectItem>
            <SelectItem value="female">Fêmea</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Temperamento, alergias, cuidados especiais..."
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : (editingPet ? 'Atualizar Pet' : 'Cadastrar Pet')}
      </Button>
    </form>
  );
};

export default PetForm;
