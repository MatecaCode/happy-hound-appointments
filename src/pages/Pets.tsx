
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Pet {
  id: string;
  name: string;
  breed?: string;
  age?: string;
}

const Pets = () => {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');

  useEffect(() => {
    if (user) {
      fetchPets();
    }
  }, [user]);

  const fetchPets = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setPets(data || []);
    } catch (error: any) {
      console.error('Error fetching pets:', error);
      toast.error('Erro ao carregar pets');
    }
  };

  const resetForm = () => {
    setName('');
    setBreed('');
    setAge('');
    setEditingPet(null);
  };

  const openDialog = (pet?: Pet) => {
    if (pet) {
      setEditingPet(pet);
      setName(pet.name);
      setBreed(pet.breed || '');
      setAge(pet.age || '');
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setIsLoading(true);
    try {
      if (editingPet) {
        // Update existing pet
        const { error } = await supabase
          .from('pets')
          .update({
            name: name.trim(),
            breed: breed.trim() || null,
            age: age.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPet.id);

        if (error) throw error;
        toast.success('Pet atualizado com sucesso!');
      } else {
        // Create new pet
        const { error } = await supabase
          .from('pets')
          .insert({
            user_id: user.id,
            name: name.trim(),
            breed: breed.trim() || null,
            age: age.trim() || null
          });

        if (error) throw error;
        toast.success('Pet adicionado com sucesso!');
      }

      await fetchPets();
      closeDialog();
    } catch (error: any) {
      console.error('Error saving pet:', error);
      toast.error('Erro ao salvar pet');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePet = async (petId: string) => {
    if (!confirm('Tem certeza que deseja remover este pet?')) return;

    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId);

      if (error) throw error;
      toast.success('Pet removido com sucesso!');
      await fetchPets();
    } catch (error: any) {
      console.error('Error deleting pet:', error);
      toast.error('Erro ao remover pet');
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-16 text-center">
          <p>Você precisa estar logado para gerenciar seus pets.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Meus Pets</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Adicionar Pet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPet ? 'Editar Pet' : 'Adicionar Novo Pet'}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do seu pet
                </DialogDescription>
              </DialogHeader>
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
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : editingPet ? 'Atualizar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {pets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pets.map((pet) => (
              <Card key={pet.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{pet.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(pet)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePet(pet.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pet.breed && (
                    <p className="text-muted-foreground">
                      <strong>Raça:</strong> {pet.breed}
                    </p>
                  )}
                  {pet.age && (
                    <p className="text-muted-foreground">
                      <strong>Idade:</strong> {pet.age}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-16 text-center">
              <div>
                <PlusCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Nenhum Pet Cadastrado</h3>
                <p className="text-muted-foreground mb-6">
                  Adicione seu primeiro pet para começar a agendar serviços
                </p>
                <Button onClick={() => openDialog()}>
                  Adicionar Primeiro Pet
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Pets;
