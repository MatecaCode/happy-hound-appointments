
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBreeds } from '@/hooks/useBreeds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { PetDobPicker } from '@/components/calendars/pet/PetDobPicker';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  breed?: string;
  breed_id?: string;
  age?: string;
  birth_date?: string;
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    editingPet?.birth_date ? new Date(editingPet.birth_date) : undefined
  );
  const [formData, setFormData] = useState({
    name: editingPet?.name || '',
    breed_id: editingPet?.breed_id || '',
    size: editingPet?.size || '',
    weight: editingPet?.weight || '',
    gender: editingPet?.gender || '',
    notes: editingPet?.notes || ''
  });

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Nome do pet é obrigatório';
    }

    // Breed validation
    if (!formData.breed_id) {
      newErrors.breed_id = 'Raça é obrigatória';
    }

    // Birth date validation (optional)
    if (birthDate && birthDate > new Date()) {
      newErrors.birth_date = 'Data de nascimento não pode ser no futuro';
    }

    // Size validation
    if (!formData.size) {
      newErrors.size = 'Porte é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

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

      // Get the breed name from the selected breed_id
      const selectedBreed = breeds.find(breed => breed.id === formData.breed_id);
      
      const petData = {
        name: formData.name,
        breed_id: formData.breed_id || null,
        breed: selectedBreed?.name || null, // Save breed name for easier access
        birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
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
          size: '',
          weight: '',
          gender: '',
          notes: ''
        });
        setBirthDate(undefined);
      }
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving pet:', error);
      toast.error('Erro ao salvar pet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert breeds to options for the combobox
  const breedOptions = breeds.map(breed => ({
    value: breed.id,
    label: breed.name
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-base font-normal text-gray-700">Nome do Pet *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => {
            setFormData({...formData, name: e.target.value});
            if (errors.name) setErrors({...errors, name: ''});
          }}
          className={errors.name ? 'border-red-500' : ''}
          required
        />
        {errors.name && (
          <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
            <AlertCircle className="w-4 h-4" />
            {errors.name}
          </div>
        )}
      </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
           <Label htmlFor="breed" className="text-base font-normal text-gray-700">Raça *</Label>
          <Combobox
            options={breedOptions}
            value={formData.breed_id}
            onValueChange={(value) => {
              setFormData({...formData, breed_id: value});
              if (errors.breed_id) setErrors({...errors, breed_id: ''});
            }}
            placeholder={breedsLoading ? "Carregando..." : "Selecione ou digite uma raça"}
            searchPlaceholder="Digite para buscar raça..."
            emptyText="Nenhuma raça encontrada."
            disabled={breedsLoading}
            className={errors.breed_id ? 'border-red-500' : ''}
          />
          {errors.breed_id && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
              <AlertCircle className="w-4 h-4" />
              {errors.breed_id}
            </div>
          )}
        </div>

                 <div>
           <Label className="text-base font-normal text-gray-700">Data de Nascimento (opcional)</Label>
          <PetDobPicker
            value={birthDate}
            onChange={(date) => {
              setBirthDate(date);
              if (errors.birth_date) setErrors({...errors, birth_date: ''});
            }}
            className={`w-full ${errors.birth_date ? 'border-red-500' : ''}`}
          />
          {errors.birth_date && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
              <AlertCircle className="w-4 h-4" />
              {errors.birth_date}
            </div>
          )}
        </div>
      </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
           <Label htmlFor="size" className="text-base font-normal text-gray-700">Porte *</Label>
          <Select 
            value={formData.size} 
            onValueChange={(value) => {
              setFormData({...formData, size: value});
              if (errors.size) setErrors({...errors, size: ''});
            }}
          >
            <SelectTrigger className={errors.size ? 'border-red-500' : ''}>
              <SelectValue placeholder="Selecione o porte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Pequeno</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="large">Grande</SelectItem>
              <SelectItem value="extra_large">Extra Grande</SelectItem>
            </SelectContent>
          </Select>
          {errors.size && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
              <AlertCircle className="w-4 h-4" />
              {errors.size}
            </div>
          )}
        </div>

                 <div>
           <Label htmlFor="weight" className="text-base font-normal text-gray-700">Peso (kg)</Label>
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
         <Label htmlFor="gender" className="text-base font-normal text-gray-700">Sexo</Label>
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
         <Label htmlFor="notes" className="text-base font-normal text-gray-700">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Temperamento, alergias, cuidados especiais..."
        />
      </div>

      <div className="pt-6 px-4">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Salvando...' : (editingPet ? 'Atualizar Pet' : 'Cadastrar Pet')}
        </Button>
      </div>
    </form>
  );
};

export default PetForm;
